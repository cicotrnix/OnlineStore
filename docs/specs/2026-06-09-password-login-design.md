# Spec — Login con email + contraseña (híbrido con magic link)

> Estado: aprobada en brainstorming Cowork (2026-06-09). Pendiente: plan de implementación.
> Decisión de negocio: pre-launch. Motivo: reducir la dependencia del email en el login diario (los magic links caen a junk en Outlook/iCloud durante el warmup de reputación; en B2B el comprador re-ordena seguido y no quiere esperar un email cada vez).

## 1. Contexto y restricción de arquitectura

El proyecto usa **Auth.js (NextAuth) v5 con sesiones de base de datos** (tabla `Session` con `activeOrgId` / `impersonatingOrgId` / `lastSeenAt`). Todo el sistema de organización activa, impersonation y el middleware dependen de esa sesión de DB.

**Restricción dura:** el Credentials provider de Auth.js v5 **exige sesiones JWT**, incompatible con las sesiones de DB de esta app. Cambiar a JWT rompería activeOrgId/impersonation/lastSeenAt — refactor mayor, descartado.

**Enfoque elegido (A):** la contraseña NO pasa por el Credentials provider. Un server action verifica email+hash y **crea la misma fila `Session` que ya genera el magic link** + setea la cookie de Auth.js. Las dos puertas (magic link y password) producen la misma sesión de DB; `auth()` y todo lo de abajo no se entera por dónde entró el usuario. Cero refactor del modelo de sesión.

El `User` hoy no tiene campo de contraseña; no hay librería de hashing instalada.

## 2. Decisiones de producto (cerradas en brainstorming)

- **Contraseña obligatoria al registrarse.** Login primario = email + contraseña.
- **Magic link se conserva**, visible en el sign-in como alternativa ("Prefiero recibir un link por email"). Sirve de login alternativo Y de recuperación.
- **Verificación de email una sola vez, al registrarse, vía magic link** (Auth.js marca `emailVerified` al clickear). El mismo link confirma el email y loguea la primera vez. Profesional, sin re-introducir dependencia del email en los logins diarios.
- **Login con contraseña bloqueado hasta que el email esté verificado** (con botón "reenviar confirmación").
- **Política de contraseña: híbrida** — mínimo 8 caracteres, exigir **letras y números** (sin símbolo obligatorio), + **medidor de fuerza** visual.
- **Usuarios existentes** (admin + datos de prueba): no se les fuerza retroactivamente; entran por magic link y setean contraseña en "Mi cuenta".

## 3. Alcance / No-alcance

**Incluye:**
- Schema: `User.hashedPassword String?` (+ `passwordUpdatedAt DateTime?`).
- Hashing con **bcryptjs** (JS puro, sin binario nativo — evita el riesgo de build de Docker tipo sharp).
- Helper `createDbSession(userId)` que mintea la sesión de Auth.js.
- Página de **sign-up** (email + contraseña) → crea usuario + dispara magic link de verificación.
- **Sign-in** con email + contraseña + alternativa magic link.
- **Recuperación** vía magic link → reset de contraseña en "Mi cuenta".
- **"Mi cuenta":** setear/cambiar contraseña (pide la actual).
- Rate-limit en login y sign-up. i18n EN/ES de todas las pantallas/labels.

- **Invalidación de las otras sesiones al cambiar/setear contraseña** (práctica estándar; movido a Incluye por seguridad — review 2026-06-09).
- **Step-up auth** para el primer set de contraseña de un usuario magic-link-only (reusa el patrón `SensitiveActionToken` / email-OTP del ADR 0032).

**No incluye (fuera de alcance):**
- Login social (Google/Apple), MFA/2FA — futuro.
- Forzar contraseña a usuarios existentes.
- **CAPTCHA / Cloudflare Turnstile** en sign-up/sign-in — FU. El rate-limit cubre el grueso; CAPTCHA es defensa-en-profundidad para después del launch.
- Verificación de email bloqueante en cada login (solo al registrarse).

## 4. Diseño técnico

### 4.1 Schema (Prisma)

```prisma
model User {
  // ...existente...
  hashedPassword    String?
  passwordUpdatedAt DateTime?
}
```

Migración aditiva. Nullable: usuarios sin contraseña (magic-link-only) tienen null.

### 4.2 Hashing — `lib/auth/password.ts`

- `bcryptjs`, cost factor 12.
- `hashPassword(plain): Promise<string>`
- `verifyPassword(plain, hash): Promise<boolean>`
- `validatePasswordPolicy(plain): { ok: boolean; reason?: string }` — mínimo 8, al menos una letra y un número. (El medidor de fuerza es UI; el gate duro es esta validación.)

### 4.3 Minteo de sesión — `lib/auth/session.ts`

`createDbSession(userId: string): Promise<void>`:
- Genera `sessionToken` con `crypto.randomUUID()` (lo que usa el core de Auth.js v5 para DB sessions).
- Crea fila `Session` con: `sessionToken`, `userId`, `expires` = ahora + `maxAge`, y `lastSeenAt: new Date()` explícito (aunque el schema tiene `@default(now())`, lo seteamos explícito por claridad). `activeOrgId`/`impersonatingOrgId` quedan null (igual que una sesión recién creada por magic link).
- **`maxAge` se lee de la config de Auth.js (`session.maxAge`), NO se hardcodea 30 días** — por si el proyecto lo cambia.
- Setea la cookie con los mismos atributos que Auth.js: nombre **`authjs.session-token`** (dev) / **`__Secure-authjs.session-token`** (prod, detectado por `NODE_ENV`/https), `httpOnly: true`, `secure` en prod, `sameSite: 'lax'`, `path: '/'`, `expires`.

**Contrato cookie/token — el punto más delicado (review 2026-06-09).** Antes/durante la implementación, confirmar empíricamente contra Auth.js v5 instalado: (a) el nombre exacto de la cookie por entorno, (b) el formato del `sessionToken`, (c) qué columnas escribe el PrismaAdapter en la fila `Session`. **Test de integración obligatorio (no alcanza typecheck):** tras `createDbSession`, hacer un request real con esa cookie → `auth()` server-side debe resolver al **mismo `userId`**. Ese test es el que valida que el contrato quedó bien.

### 4.4 Acciones

- `passwordSignInAction(prev, formData)`:
  - Rate-limit por `${ip}:${email}` (reusar/ extender `lib/rate-limit`).
  - Buscar user por email. Si no existe o `hashedPassword` null → comparar contra un hash dummy (anti timing) y devolver error genérico.
  - Si `emailVerified` null → `ActionResult` "confirmá tu email" + permitir reenviar.
  - `verifyPassword`; si falla → error genérico ("email o contraseña inválidos").
  - Éxito → `createDbSession(user.id)` → redirect (`/select-org` resuelve org única, o `/catalog`).
  - Devuelve `ActionResult` (patrón `useFormState`, React 18 — como el sign-in actual).
- `signUpAction(prev, formData)`:
  - Rate-limit: por `${ip}:${email}` **y** un bucket adicional **por IP global** (evita signup-bombing ciclando emails).
  - Validar email + `validatePasswordPolicy`.
  - **Anti account-hijack (obligatorio, review 2026-06-09):** si el email **ya existe** en `User` — **verificado o no, con o sin contraseña** — rebotar el signup con error "ya existe una cuenta con ese email, iniciá sesión" y link a `/sign-in`. **Nunca** completar/pisar una `User` row existente con el hash del que se registra. Para un usuario magic-link-only que quiere contraseña, el camino es: entrar por magic link → setearla en "Mi cuenta" (con step-up, ver abajo).
  - Solo si el email **no existe**: crear `User` con `hashedPassword` (emailVerified null).
  - Disparar magic link de verificación: `signIn('resend', { email, redirect: false })` (Auth.js manda el link; al clickear marca `emailVerified` + crea sesión).
  - Devolver `ActionResult` → pantalla "Revisá tu email para confirmar" (con aviso de spam + reenviar).
- `changePasswordAction` (en "Mi cuenta", usuario que **ya tiene** contraseña): pide la **contraseña actual** (re-auth), valida política, hashea, guarda, set `passwordUpdatedAt`.
- `setPasswordAction` (primer set, usuario magic-link-only **sin** contraseña): no hay contraseña actual que pedir → **requiere step-up auth** (email-OTP / `SensitiveActionToken`, reusando el patrón del ADR 0032) antes de aceptar el set. Evita que una sesión robada setee contraseña y secuestre la cuenta.
- **Ambas acciones de password (change/set):** tras guardar, **invalidar las otras sesiones del usuario**: `prisma.session.deleteMany({ where: { userId, sessionToken: { not: currentToken } } })`. Así una sesión robada no sobrevive al cambio.

### 4.5 UI

- **`/sign-up`** (nueva): email, contraseña (+ confirmar), medidor de fuerza. Submit → signUpAction.
- **`/sign-in`** (modificar): email + contraseña + "Entrar" (passwordSignInAction). Debajo, **explícito**: un link **"¿Olvidaste tu contraseña?"** → flujo magic link (no depender de que el usuario adivine la opción secundaria), y "Prefiero recibir un link por email" como alternativa de login. Link "¿No tenés cuenta? Registrate" → /sign-up.
- **Homepage / "Registrarse":** apunta a `/sign-up`.
- **"Mi cuenta":** sección de contraseña (set/change, según las reglas de step-up/re-auth de §4.4).
- **Medidor de fuerza más exigente que el gate:** el gate mínimo es 8 + letra + número; el medidor debe marcar eso como **"débil"** y exigir más para "fuerte" (no engañar al usuario mostrando "fuerte" en el mínimo).
- Todo i18n EN/ES con paridad.

## 5. Seguridad

- Hash bcryptjs cost 12; nunca loguear/guardar la contraseña en claro.
- Error genérico en login (no user-enumeration) + dummy compare anti-timing.
- Rate-limit en login y sign-up por IP+email.
- Login con contraseña gateado por `emailVerified`.
- Cookie httpOnly + secure (prod) + sameSite lax.
- Política híbrida (min 8, letra+número).
- **Anti account-hijack:** signup rebota si el email ya existe (no pisa rows).
- **Step-up** (email-OTP, ADR 0032) para el primer set de contraseña de un usuario sin contraseña.
- **Invalidación de las otras sesiones** al setear/cambiar contraseña.

## 6. Testing (TDD)

- **Unit:** `hashPassword`/`verifyPassword` round-trip; `validatePasswordPolicy` (casos límite); `passwordSignInAction` (válido → sesión; inválido → error genérico sin sesión; email no verificado → bloqueado; rate-limit tras N); `signUpAction` (crea user + dispara magic link; email duplicado → error); `createDbSession` crea la fila `Session`.
- **E2e:** sign-up email+password → (mock) verificación → logueado → onboarding; sign-out → login con password → ok; password incorrecta → error; recuperación por magic link visible.
- **Integración del contrato de sesión (obligatorio, valida §8/§4.3):** crear sesión vía `createDbSession` (o vía passwordSignInAction) → request real con esa cookie → `auth()` resuelve el **mismo userId**. Es la prueba directa de que la cookie/token replica a Auth.js.
- **Seguridad:** signup con email existente (magic-link-only) → rebota, no pisa la row; change-password invalida las otras sesiones (verificar que un sessionToken viejo deja de resolver).
- **Regresión:** magic link actual intacto; suite existente verde.

## 7. Criterios de aceptación

1. Registro nuevo: email+contraseña → magic link de confirmación → al clickear, email verificado + logueado + onboarding.
2. Login posterior: email+contraseña entra sin email.
3. Contraseña incorrecta / email inexistente → mismo error genérico.
4. Email no verificado + intento de password → bloqueado con opción de reenviar.
5. Magic link sigue disponible como alternativa y como recuperación.
6. Política híbrida aplicada (min 8, letra+número) + medidor en la UI.
7. `auth()`, activeOrgId, impersonation, middleware funcionan igual con sesión creada por contraseña (validado por el test de integración cookie→auth()).
8. Signup con email ya existente → rebota a /sign-in, sin pisar la row.
9. Cambiar/setear contraseña invalida las otras sesiones; el primer set (sin contraseña previa) exige step-up.
10. Gate verde: `pnpm format && lint && typecheck && test && STORE_ID=pipower build` + e2e (incl. el de integración de sesión). Paridad EN/ES. `MAINTENANCE_MODE`/pagos sin tocar.

## 8. Riesgos / notas

- **Lo más delicado:** `createDbSession` debe replicar exacto la cookie/token de Auth.js v5. Verificar empíricamente que `auth()` lee la sesión creada (test de integración + smoke).
- bcryptjs (no `bcrypt` nativo) para evitar el problema de binario en Docker.
- La verificación de email al registrarse sigue dependiendo del email una vez — mitigado con aviso de spam + reenviar; es one-time, no en cada login.
