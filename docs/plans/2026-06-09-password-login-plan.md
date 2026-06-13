# Password Login (híbrido) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Agregar login con email + contraseña (obligatoria al registrarse) como entrada alternativa que crea la misma sesión de DB de Auth.js, conservando el magic link como verificación de email (one-time) y recuperación.

**Architecture:** Enfoque A — la contraseña NO usa el Credentials provider de Auth.js (incompatible con DB sessions). Un server action verifica email+hash (bcryptjs) y crea la misma fila `Session` + cookie que ya genera el magic link, vía un helper `createDbSession`. Todo lo de abajo (activeOrgId, impersonation, middleware) queda intacto.

**Tech Stack:** Next.js 14, Auth.js v5 (DB sessions), Prisma/Postgres, bcryptjs, Vitest, Playwright, Biome. React 18 (`useFormState`, no `useActionState`).

**Spec:** `docs/specs/2026-06-09-password-login-design.md`
**Branch:** `feat/password-login` desde `main` actualizado.
**Reglas:** TDD donde se marca. Gate por tarea (`pnpm lint && typecheck && test`); build siempre `STORE_ID=pipower pnpm build`. Rojo → STOP. No tocar `MAINTENANCE_MODE`, pagos, adaptadores.

---

## File Structure

- `lib/auth/password.ts` (nuevo) — hash/verify/policy. Responsabilidad: criptografía de contraseña + validación de política.
- `lib/auth/session.ts` (nuevo) — `createDbSession` (mint sesión + cookie Auth.js).
- `app/(auth)/sign-up/page.tsx` + `SignUpForm.tsx` + `actions.ts` (nuevo) — registro.
- `app/(auth)/sign-in/` (modificar) — agregar password + "olvidé contraseña".
- `app/(account)/account/` (nuevo o existente) — sección de contraseña.
- `lib/auth/active-org.ts` y `lib/rate-limit.ts` — reusar.
- `prisma/schema.prisma` — `User.hashedPassword`, `passwordUpdatedAt`.
- Tests junto a cada archivo en `__tests__/`; e2e en `tests/e2e/`.

---

### Task 0: Pre-requisitos — verificar contratos empíricamente (sin código de feature)

> El punto §8 de la spec. Antes de construir, confirmar contra el Auth.js v5 instalado. Documentar resultados en la descripción del PR.

- [ ] **Step 1: Nombre y atributos de la cookie de sesión.** Buscar el helper de Auth.js para el nombre de cookie en vez de re-detectar:

Run: `grep -rn "session-token\|cookies\b\|__Secure" node_modules/@auth/core/lib 2>/dev/null | grep -i token | head`
Anotar: nombre exacto en dev (`authjs.session-token`) y prod (`__Secure-authjs.session-token`), y cómo Auth.js decide el prefijo (`useSecureCookies` = la URL es https). **Decisión:** derivar el prefijo de `process.env.NEXTAUTH_URL?.startsWith('https')` (alineado con cómo Auth.js lo calcula), no de `NODE_ENV`.

- [ ] **Step 2: Formato del `sessionToken` + columnas que escribe el adapter.**

Run: `grep -rn "createSession\|sessionToken\|randomUUID\|generateSessionToken" node_modules/@auth/core node_modules/@auth/prisma-adapter 2>/dev/null | head`
Confirmar: el core usa `crypto.randomUUID()` para el token; el adapter escribe `sessionToken`, `userId`, `expires`. Las columnas extra (`activeOrgId`, `impersonatingOrgId`, `lastSeenAt`) son del schema propio con defaults/nullable.

- [ ] **Step 3: `maxAge`.** `grep -n "maxAge" lib/auth/config.ts` — si no está seteado, Auth.js default = 30 días (2592000 s). Anotar la fuente que usará `createDbSession`.

- [ ] **Step 4: `emailVerified` al clickear el magic link.** Verificar empíricamente (o en docs de Auth.js) que el flujo Resend/Email **marca `User.emailVerified`** al verificar. Si la config actual no lo hace automáticamente, anotar que hace falta setearlo en un callback `events.signIn` o `signIn` callback. Documentar el resultado.

- [ ] **Step 5: Step-up disponible.** `grep -rn "SensitiveActionToken\|stepUp\|step-up\|email.*otp" modules lib --include=*.ts | grep -v __tests__ | head` — localizar la API existente (ADR 0032, usada en refunds) y anotar cómo emitir/verificar un token para una acción sensible. Será reusada en Task 6.

### Task 1: Schema — campos de contraseña

**Files:** Modify: `prisma/schema.prisma`; migración Prisma.

- [ ] **Step 1:** En `model User`, agregar:

```prisma
  hashedPassword    String?
  passwordUpdatedAt DateTime?
```

- [ ] **Step 2:** Generar migración: `pnpm prisma migrate dev --name add_user_password` (aditiva, nullable).
- [ ] **Step 3:** `pnpm prisma generate` + `pnpm typecheck` → verde.
- [ ] **Step 4:** Commit: `feat(auth): add hashedPassword/passwordUpdatedAt to User`

### Task 2: Hashing + política de contraseña (TDD)

**Files:** Create `lib/auth/password.ts`, Test `lib/auth/__tests__/password.test.ts`. Dep: `pnpm add bcryptjs && pnpm add -D @types/bcryptjs`.

- [ ] **Step 1: Test que falla** — `lib/auth/__tests__/password.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword, validatePasswordPolicy } from '@/lib/auth/password'

describe('password', () => {
  it('hash + verify round-trip', async () => {
    const h = await hashPassword('Abcd1234')
    expect(h).not.toBe('Abcd1234')
    expect(await verifyPassword('Abcd1234', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
  it('policy: mínimo 8 + letra + número', () => {
    expect(validatePasswordPolicy('Abcd1234').ok).toBe(true)
    expect(validatePasswordPolicy('short1').ok).toBe(false)      // < 8
    expect(validatePasswordPolicy('abcdefgh').ok).toBe(false)    // sin número
    expect(validatePasswordPolicy('12345678').ok).toBe(false)    // sin letra
  })
})
```

- [ ] **Step 2:** Run `pnpm vitest run lib/auth/__tests__/password.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3: Implementación** — `lib/auth/password.ts`:

```ts
import bcrypt from 'bcryptjs'

const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export interface PolicyResult {
  ok: boolean
  reason?: string
}

/** Gate mínimo: ≥8, al menos una letra y un número. (El medidor de UI es más exigente.) */
export function validatePasswordPolicy(plain: string): PolicyResult {
  if (plain.length < 8) return { ok: false, reason: 'minLength' }
  if (!/[a-zA-Z]/.test(plain)) return { ok: false, reason: 'needsLetter' }
  if (!/[0-9]/.test(plain)) return { ok: false, reason: 'needsNumber' }
  return { ok: true }
}

/** Hash dummy para comparación anti-timing cuando el usuario no existe. */
export const DUMMY_HASH = bcrypt.hashSync('dummy-anti-timing-value', COST)
```

- [ ] **Step 4:** Run el test → PASS. `pnpm typecheck && pnpm test` → verde.
- [ ] **Step 5:** Commit: `feat(auth): password hashing (bcryptjs) + hybrid policy (TDD)`

### Task 3: `createDbSession` + test de integración (TDD — crítico)

**Files:** Create `lib/auth/session.ts`, Test `lib/auth/__tests__/session.test.ts`.

> Usa los hallazgos de Task 0 (nombre de cookie, token, maxAge).

- [ ] **Step 1: Test de integración que falla** — `lib/auth/__tests__/session.test.ts`. Crea un user real (cleanDb), llama `createDbSession`, y verifica que (a) existe una fila `Session` para ese user con `lastSeenAt` no-null, y (b) la cookie se setea con el nombre esperado. (El test full cookie→`auth()` va en el e2e de Task 8.)

```ts
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = new Map<string, { value: string; opts: unknown }>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: (name: string, value: string, opts: unknown) => cookieStore.set(name, { value, opts }),
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name)!.value } : undefined),
  })),
}))

beforeEach(async () => { await cleanDb(); cookieStore.clear() })
afterEach(() => vi.unstubAllEnvs())

describe('createDbSession', () => {
  it('crea fila Session + cookie para el user', async () => {
    const { createDbSession } = await import('@/lib/auth/session')
    const u = await prisma.user.create({ data: { email: `s-${Date.now()}@t.com` } })
    await createDbSession(u.id)
    const sess = await prisma.session.findFirst({ where: { userId: u.id } })
    expect(sess).not.toBeNull()
    expect(sess!.lastSeenAt).toBeInstanceOf(Date)
    expect(sess!.activeOrgId).toBeNull()
    // cookie seteada (nombre dev por default)
    expect(cookieStore.has('authjs.session-token')).toBe(true)
  })
})
```

- [ ] **Step 2:** Run → FAIL (módulo no existe).
- [ ] **Step 3: Implementación** — `lib/auth/session.ts` (ajustar nombre/maxAge según Task 0):

```ts
import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'

const DEFAULT_MAX_AGE_S = 30 * 24 * 60 * 60 // 30d — fallback; idealmente leer de la config de Auth.js

function cookieName(): string {
  const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
  return secure ? '__Secure-authjs.session-token' : 'authjs.session-token'
}

/**
 * Crea una sesión de DB equivalente a la que genera Auth.js (magic link) y
 * setea la cookie de sesión. Reusado por login con contraseña y sign-up.
 */
export async function createDbSession(userId: string): Promise<void> {
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + DEFAULT_MAX_AGE_S * 1000)
  await prisma.session.create({
    data: { sessionToken: token, userId, expires, lastSeenAt: new Date() },
  })
  const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
  const store = await cookies()
  store.set(cookieName(), token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires,
  })
}
```

- [ ] **Step 4:** Run el test → PASS. `pnpm typecheck && pnpm test` → verde.
- [ ] **Step 5:** Commit: `feat(auth): createDbSession mints Auth.js-compatible DB session (TDD)`

### Task 4: `passwordSignInAction` (TDD)

**Files:** Create `app/(auth)/sign-in/password-actions.ts`, Test `app/(auth)/sign-in/__tests__/password-actions.test.ts`.

- [ ] **Step 1: Test que falla** — casos: válido → `{ok:true}` + sesión creada; password incorrecta → `{ok:false, messageKey:'auth.toast.invalidCredentials'}` sin sesión; email inexistente → mismo error genérico, sin sesión; email no verificado → `{ok:false, messageKey:'auth.toast.emailNotVerified'}`. Mockear `next/headers` (cookies + headers para IP), `resetRateLimits` en beforeEach.

```ts
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { hashPassword } from '@/lib/auth/password'
import { resetRateLimits } from '@/lib/rate-limit'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: (n: string, v: string) => cookieStore.set(n, v), get: () => undefined })),
  headers: vi.fn(async () => ({ get: () => '1.2.3.4' })),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn((u: string) => { throw new Error(`REDIRECT:${u}`) }) }))

beforeEach(async () => { await cleanDb(); cookieStore.clear(); resetRateLimits() })

async function makeUser(opts: { verified: boolean; password?: string }) {
  return prisma.user.create({
    data: {
      email: `u-${Date.now()}-${Math.random()}@t.com`,
      emailVerified: opts.verified ? new Date() : null,
      hashedPassword: opts.password ? await hashPassword(opts.password) : null,
    },
  })
}

describe('passwordSignInAction', () => {
  it('credenciales válidas + verificado → ok + sesión', async () => {
    const u = await makeUser({ verified: true, password: 'Abcd1234' })
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData(); fd.set('email', u.email); fd.set('password', 'Abcd1234')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(1)
  })
  it('password incorrecta → error genérico, sin sesión', async () => {
    const u = await makeUser({ verified: true, password: 'Abcd1234' })
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData(); fd.set('email', u.email); fd.set('password', 'WRONGpass1')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.invalidCredentials' })
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0)
  })
  it('email inexistente → mismo error genérico', async () => {
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData(); fd.set('email', 'nope@t.com'); fd.set('password', 'Abcd1234')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.invalidCredentials' })
  })
  it('email no verificado → bloqueado', async () => {
    const u = await makeUser({ verified: false, password: 'Abcd1234' })
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData(); fd.set('email', u.email); fd.set('password', 'Abcd1234')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.emailNotVerified' })
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementación** — `app/(auth)/sign-in/password-actions.ts`:

```ts
'use server'

import { prisma } from '@/lib/db/client'
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password'
import { createDbSession } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/feedback/action-result'
import { SIGNIN_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function passwordSignInAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!email || !password) return { ok: false, messageKey: 'auth.toast.invalidCredentials' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`pwlogin:${ip}:${email}`, SIGNIN_LIMITS).allowed) {
    return { ok: false, messageKey: 'auth.toast.rateLimited' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  // Anti-timing: comparar siempre, aun si no hay user/hash.
  const hash = user?.hashedPassword ?? DUMMY_HASH
  const valid = await verifyPassword(password, hash)
  if (!user || !user.hashedPassword || !valid) {
    return { ok: false, messageKey: 'auth.toast.invalidCredentials' }
  }
  if (!user.emailVerified) {
    return { ok: false, messageKey: 'auth.toast.emailNotVerified' }
  }
  await createDbSession(user.id)
  return { ok: true, messageKey: 'auth.toast.signedIn' }
}
```

**Decisión de diseño:** el action **retorna `{ok:true}`** (no hace `redirect`) para que sea testeable sin throw. El form (Task 7) hace `router.push('/select-org')` cuando `state.ok`. Por eso no se importa `redirect` acá.

- [ ] **Step 4:** Run → PASS. Gate verde.
- [ ] **Step 5:** Commit: `feat(auth): password sign-in action (TDD, generic error, rate-limit, verified gate)`

### Task 5: `signUpAction` (TDD — anti-hijack + race)

**Files:** Create `app/(auth)/sign-up/actions.ts`, Test `app/(auth)/sign-up/__tests__/actions.test.ts`.

- [ ] **Step 1: Test que falla** — casos: email nuevo → crea user con hash, emailVerified null, dispara signIn('resend'); **email ya existente (con o sin password) → rebota `{ok:false, messageKey:'auth.toast.accountExists'}` sin pisar la row**; política inválida → error. Mockear `@/lib/auth` `signIn`.

```ts
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { resetRateLimits } from '@/lib/rate-limit'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn(async () => undefined)
vi.mock('@/lib/auth', () => ({ signIn: signInMock }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => ({ get: () => '1.2.3.4' })) }))

beforeEach(async () => { await cleanDb(); signInMock.mockClear(); resetRateLimits() })

describe('signUpAction', () => {
  it('email nuevo → crea user con hash + dispara magic link', async () => {
    const { signUpAction } = await import('../actions')
    const fd = new FormData(); fd.set('email', 'new@t.com'); fd.set('password', 'Abcd1234')
    const r = await signUpAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    const u = await prisma.user.findUnique({ where: { email: 'new@t.com' } })
    expect(u?.hashedPassword).toBeTruthy()
    expect(u?.emailVerified).toBeNull()
    expect(signInMock).toHaveBeenCalledWith('resend', { email: 'new@t.com', redirect: false })
  })
  it('email ya existe → rebota sin pisar la row', async () => {
    await prisma.user.create({ data: { email: 'taken@t.com', emailVerified: new Date() } })
    const { signUpAction } = await import('../actions')
    const fd = new FormData(); fd.set('email', 'taken@t.com'); fd.set('password', 'Abcd1234')
    const r = await signUpAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.accountExists' })
    const u = await prisma.user.findUnique({ where: { email: 'taken@t.com' } })
    expect(u?.hashedPassword).toBeNull() // NO se pisó
    expect(signInMock).not.toHaveBeenCalled()
  })
  it('política inválida → error', async () => {
    const { signUpAction } = await import('../actions')
    const fd = new FormData(); fd.set('email', 'x@t.com'); fd.set('password', 'short')
    const r = await signUpAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
    expect(r.messageKey).toBe('auth.toast.weakPassword')
  })
})
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementación** — `app/(auth)/sign-up/actions.ts`:

```ts
'use server'

import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/db/client'
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password'
import type { ActionResult } from '@/lib/feedback/action-result'
import { SIGNIN_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const SIGNUP_IP_LIMITS = { perMinute: 5, perHour: 20 }

export async function signUpAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!email) return { ok: false, messageKey: 'auth.toast.invalidEmail' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`signup:${ip}:${email}`, SIGNIN_LIMITS).allowed) return { ok: false, messageKey: 'auth.toast.rateLimited' }
  if (!checkRateLimit(`signup-ip:${ip}`, SIGNUP_IP_LIMITS).allowed) return { ok: false, messageKey: 'auth.toast.rateLimited' }

  if (!validatePasswordPolicy(password).ok) return { ok: false, messageKey: 'auth.toast.weakPassword' }

  // Anti account-hijack: si el email ya existe (verificado o no, con o sin pass), rebotar.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return { ok: false, messageKey: 'auth.toast.accountExists' }

  const hashed = await hashPassword(password)
  try {
    await prisma.user.create({ data: { email, hashedPassword: hashed } })
  } catch (e) {
    // Race: dos signups paralelos con el mismo email → P2002 unique.
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return { ok: false, messageKey: 'auth.toast.accountExists' }
    }
    throw e
  }

  await signIn('resend', { email, redirect: false })
  return { ok: true, messageKey: 'auth.toast.checkEmailToConfirm' }
}
```

- [ ] **Step 4:** Run → PASS. Gate verde.
- [ ] **Step 5:** Commit: `feat(auth): sign-up action with anti-hijack + P2002 race guard (TDD)`

### Task 6: Set/change password en "Mi cuenta" (TDD — step-up + invalidación)

**Files:** Create `app/(account)/account/password-actions.ts`, Test `__tests__/password-actions.test.ts`. Reusar el step-up de Task 0 (Step 5).

- [ ] **Step 1: Test que falla** — `changePasswordAction`: con contraseña actual correcta → actualiza hash + `passwordUpdatedAt` + **borra las otras sesiones del user** (deja la actual); contraseña actual incorrecta → error. `setPasswordAction` (sin pass previa): sin token de step-up válido → error; con token válido → setea. Mockear `auth()` (sesión del user actual), `cookies()` (currentToken), y el verificador de step-up.

(Escribir asserts concretos: tras change, `prisma.session.count({where:{userId, sessionToken:{not: current}}})` === 0; `passwordUpdatedAt` no-null.)

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementación** — `password-actions.ts`:
  - `changePasswordAction`: `auth()` → userId; leer `currentToken` de `cookies().get(cookieName())`; validar `currentPassword` con `verifyPassword` contra el hash actual; validar política de la nueva; `hashPassword`; `prisma.user.update({ hashedPassword, passwordUpdatedAt: new Date() })`; `prisma.session.deleteMany({ where: { userId, sessionToken: { not: currentToken } } })`.
  - `setPasswordAction` (user sin `hashedPassword`): exigir un **step-up token válido** (emitido vía el mecanismo de ADR 0032 — magic link / email-OTP fresco; elegir el vehículo en Task 0). Sin token → error `auth.toast.stepUpRequired`. Con token válido → misma lógica de set + invalidación.
  - Exportar `cookieName()` desde `lib/auth/session.ts` para reusar (refactor menor) en vez de duplicar la heurística.

- [ ] **Step 4:** Run → PASS. Gate verde.
- [ ] **Step 5:** Commit: `feat(auth): set/change password with step-up + session invalidation (TDD)`

### Task 7: UI — sign-up, sign-in, cuenta, i18n

**Files:** Create `app/(auth)/sign-up/page.tsx` + `SignUpForm.tsx`; Modify `app/(auth)/sign-in/page.tsx` + `SignInForm.tsx`; account password UI; `lib/i18n/messages.ts`.

- [ ] **Step 1:** `SignUpForm.tsx` (client, patrón de `SignInForm`): inputs email + password + confirmar, **medidor de fuerza** (componente client que evalúa: marca "débil" en el mínimo del gate, exige largo/variedad para "fuerte"), `useFormState(signUpAction, INITIAL_ACTION_RESULT)`, toast vía el `useEffect` existente. `/sign-up/page.tsx` server: render del form + link "¿Ya tenés cuenta? Entrá".
- [ ] **Step 2:** `SignInForm.tsx`: agregar campo password + botón "Entrar" (`useFormState(passwordSignInAction, ...)`, on `ok` → `router.push('/select-org')`); **link explícito "¿Olvidaste tu contraseña?"** → dispara el flujo magic link (reusa `signInAction` existente) con copy de recuperación; y "Prefiero recibir un link por email" como alternativa. Mantener el `SubmitButton` con pending.
- [ ] **Step 3:** Homepage / "Registrarse" → apunta a `/sign-up`.
- [ ] **Step 4:** Sección de contraseña en "Mi cuenta" (set vs change según tenga `hashedPassword`).
- [ ] **Step 5:** i18n: agregar en `lib/i18n/messages.ts` (union type + en-US + es-419, **paridad**) todas las keys nuevas: `auth.toast.invalidCredentials`, `auth.toast.emailNotVerified`, `auth.toast.accountExists`, `auth.toast.weakPassword`, `auth.toast.checkEmailToConfirm`, `auth.toast.invalidEmail`, `auth.toast.stepUpRequired`, `auth.toast.signedIn`, + labels de sign-up/sign-in/cuenta + textos del medidor. Aviso "revisá tu spam" en la pantalla de confirmación.
- [ ] **Step 6:** Gate verde (incl. test de paridad EN/ES).
- [ ] **Step 7:** Commit: `feat(auth): sign-up/sign-in/account password UI + i18n`

### Task 8: E2e — flujos + contrato de sesión + seguridad

**Files:** Create `tests/e2e/password-auth.spec.ts`.

- [ ] **Step 1:** E2e de **contrato de sesión (valida §8):** vía un endpoint de test o el flujo de login con password (sembrar user verificado con password), hacer login → con la cookie resultante, pegar a una ruta protegida (`/orders` o `/account`) → debe resolver autenticado (no redirige a `/sign-in`). Esto prueba que la cookie/token de `createDbSession` la lee `auth()`.
- [ ] **Step 2:** Flujo sign-up → (mock/seed) verificación → login con password → ok; password incorrecta → error; "¿Olvidaste tu contraseña?" visible y dispara magic link.
- [ ] **Step 3:** Seguridad: signup con email existente → rebota; tras change-password, una cookie/sesión vieja deja de resolver.
- [ ] **Step 4:** Correr la suite e2e existente → verde (regresión: magic link intacto).
- [ ] **Step 5:** Commit: `test(e2e): password auth flows + session contract + security`

### Task 9: Gate final + PR

- [ ] **Step 1:** `pnpm format && pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` + e2e → todo verde.
- [ ] **Step 2:** Verificación manual local: sign-up → confirmar (magic link en consola dev) → login con password → entrar; cambiar password → sesión vieja muere.
- [ ] **Step 3:** Push + PR `feat(auth): hybrid email+password login`. Descripción incluye: resultados de los audits de Task 0 (nombre de cookie, token, maxAge, emailVerified, step-up), y nota de que tras merge no hay env nueva requerida.
- [ ] **Step 4:** **No mergear** — review en Cowork.

---

## Notas de implementación (de la review 2026-06-09)

- **Cookie name:** preferir helper de Auth.js si existe; sino la heurística `NEXTAUTH_URL https?` (Task 0/3).
- **Step-up vehicle:** decidir en Task 0 si se reusa el email-OTP/`SensitiveActionToken` del ADR 0032 o el magic link como vehículo. Cualquiera sirve; elegir uno y ser consistente.
- **emailVerified:** si Auth.js Resend no lo marca auto al verificar, setearlo en un callback (Task 0 lo confirma).
- **Orden en signup:** crear `User` (email único) ANTES de `signIn('resend')` para no chocar con el upsert interno del provider.
- **`currentToken`** para `deleteMany`: leer de `cookies()` server-side antes de borrar.
- No tocar el modelo de sesión ni el flujo magic link existente. Reusar `lib/rate-limit`, `lib/auth/active-org`, `useFormState` (React 18, NO `useActionState`).
