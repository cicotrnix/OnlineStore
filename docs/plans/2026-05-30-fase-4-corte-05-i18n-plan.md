# Fase 4 · Corte 0.5 — Infra i18n (cookie + preferencia de usuario)

> **For agentic workers:** REQUIRED SUB-SKILL: usar superpowers:subagent-driven-development. Steps usan checkbox.

**Goal:** Infra mínima de bilingüe EN/ES (cookie-based, NO routing por path), suficiente para que el Corte 1 (generación de contenido) renderee `ProductContent` del locale activo con fallback EN. Sin librería externa.

**Architecture:** Locale resolution server-side via `next/headers` cookies. Persistencia opcional en `User.preferredLocale` para sobreescribir el default cuando el usuario está logueado. Diccionario chico de strings UI hardcodeadas EN/ES (footer, "Iniciá sesión", switch label) en `lib/i18n/messages.ts`. ProductContent ya tiene su propio storage por locale (ADR 0022) — i18n no toca eso, solo le pasa el locale activo.

**Tech Stack:** Next.js 14 RSC + server actions, cookie estándar (no librería), Prisma para `User.preferredLocale`. Patrón existente a imitar: `app/(storefront)/layout.tsx` (RSC con `auth()`), `components/commerce/CatalogToggle.tsx` (server action que persiste preferencia + cookie).

**Alcance:**
- 2 locales: `en-US` (default), `es-419`.
- Cookie name: `locale`. Cookie max-age 1 año.
- Switch component visible en header del storefront (junto al cart/notifications).
- `lib/i18n/getLocale()` server-side.
- Helper `t(messages, key)` simple — NO interpolación con plurales (YAGNI).
- Logueado: preferencia DB > cookie > default.
- Anónimo: cookie > default.

**Fuera de alcance (defer):**
- Routing `/[locale]/...` (no necesario, decisión tomada en ADR 0025).
- Traducción de todo el sitio. Solo strings nuevas de Fase 4 + algunos textos del footer. Lo demás queda en su idioma actual hasta que Cowork lo decida.
- Negociación `Accept-Language` del navegador. Defer.
- next-intl / lingui / etc.

**Spec de referencia:** `docs/specs/2026-05-30-fase-4-ia-aplicada.md` §2.2, §14.4.

---

## File structure

| Archivo | Responsabilidad |
|---|---|
| `prisma/schema.prisma` | + `User.preferredLocale String?` |
| `lib/i18n/index.ts` | Re-export superficie pública |
| `lib/i18n/locale.ts` | `getLocale()` server-side + `setLocaleCookie()` + tipos |
| `lib/i18n/messages.ts` | Diccionarios EN/ES + helper `t(locale, key)` |
| `lib/i18n/__tests__/locale.test.ts` | Tests de resolución (cookie / db / default) |
| `lib/i18n/__tests__/messages.test.ts` | Tests del helper `t` |
| `app/(storefront)/_actions.ts` | + `setLocaleAction(formData)` (server action) |
| `components/commerce/LocaleSwitch.tsx` | Client component, form POST a `setLocaleAction` |
| `app/(storefront)/layout.tsx` | Renderea `<LocaleSwitch />` en el header |
| `docs/adr/0025-i18n-cookie-vs-routing.md` | ADR de la decisión |

---

## Task 0.5.1: Schema `User.preferredLocale`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar campo a `User`**

Dentro de `model User`, agregar:

```prisma
  preferredLocale String?
```

- [ ] **Step 2: Migración**

Carga env primero: `set -a && . ./.env.local && set +a`

Run: `pnpm prisma migrate dev --name user_preferred_locale`
Expected: migración limpia, prisma generate ok.

- [ ] **Step 3: Smoke test inline (no archivo)**

Verificar que Prisma client incluye el campo:

```bash
pnpm tsx -e "import { prisma } from '@/lib/db/client'; (async () => { const u = await prisma.user.findFirst({ select: { id: true, preferredLocale: true } }); console.log(u); await prisma.\$disconnect() })()"
```

Expected: corre sin error (devuelve `null` si no hay usuarios o un objeto válido).

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(i18n): User.preferredLocale para persistir preferencia de idioma"
```

---

## Task 0.5.2: `lib/i18n/locale.ts` + messages + helper `t`

**Files:**
- Create: `lib/i18n/locale.ts`
- Create: `lib/i18n/messages.ts`
- Create: `lib/i18n/index.ts`
- Create: `lib/i18n/__tests__/locale.test.ts`
- Create: `lib/i18n/__tests__/messages.test.ts`

- [ ] **Step 1: Tests del helper `t` (fallan primero)**

Crear `lib/i18n/__tests__/messages.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { t, MESSAGES, type Locale } from '../messages'

describe('i18n messages', () => {
  it('devuelve string del locale activo', () => {
    expect(t('en-US', 'localeSwitch.label')).toBe('Language')
    expect(t('es-419', 'localeSwitch.label')).toBe('Idioma')
  })

  it('fallback a EN si la key no existe en el locale activo', () => {
    // Forzamos un dict ES que no tiene una key — el helper cae a EN.
    expect(t('es-419', 'fallback.test' as never)).toBe(MESSAGES['en-US']['fallback.test' as never] ?? '')
  })

  it('todos los locales soportados tienen las mismas keys que en-US', () => {
    const enKeys = Object.keys(MESSAGES['en-US']).sort()
    const esKeys = Object.keys(MESSAGES['es-419']).sort()
    expect(esKeys).toEqual(enKeys)
  })
})
```

- [ ] **Step 2: Implementar `messages.ts`**

```ts
export const LOCALES = ['en-US', 'es-419'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en-US'

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value === 'en-US' || value === 'es-419'
}

type MessageKey =
  | 'localeSwitch.label'
  | 'localeSwitch.en'
  | 'localeSwitch.es'
  | 'product.signInForPrice'
  | 'product.outOfStock'

type Dict = Record<MessageKey, string>

export const MESSAGES: Record<Locale, Dict> = {
  'en-US': {
    'localeSwitch.label': 'Language',
    'localeSwitch.en': 'English',
    'localeSwitch.es': 'Español',
    'product.signInForPrice': 'Sign in to see prices',
    'product.outOfStock': 'Out of stock',
  },
  'es-419': {
    'localeSwitch.label': 'Idioma',
    'localeSwitch.en': 'English',
    'localeSwitch.es': 'Español',
    'product.signInForPrice': 'Iniciá sesión para ver precios',
    'product.outOfStock': 'Sin stock',
  },
}

export function t(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? ''
}
```

- [ ] **Step 3: Correr test — verde**

```bash
set -a && . ./.env.local && set +a
pnpm vitest run lib/i18n/__tests__/messages.test.ts
```

Expected: 3/3 PASS. El test "fallback" usa `as never` para forzar una key fuera del tipo; en runtime devuelve string vacío — ajustar la aserción si rompe (esperamos `''`).

- [ ] **Step 4: Tests de `getLocale` (fallan primero)**

Crear `lib/i18n/__tests__/locale.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getLocale', () => {
  it('devuelve preferredLocale del user si está logueado y es válido', async () => {
    const { cookies } = await import('next/headers')
    const { prisma } = await import('@/lib/db/client')
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredLocale: 'es-419' } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: 'u1' })).toBe('es-419')
  })

  it('cae al cookie si user no tiene preferredLocale', async () => {
    const { cookies } = await import('next/headers')
    const { prisma } = await import('@/lib/db/client')
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'es-419' }) } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredLocale: null } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: 'u1' })).toBe('es-419')
  })

  it('anónimo + cookie válida = locale del cookie', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'es-419' }) } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: null })).toBe('es-419')
  })

  it('anónimo + sin cookie = DEFAULT_LOCALE (en-US)', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: null })).toBe('en-US')
  })

  it('cookie con valor no soportado = DEFAULT_LOCALE', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'fr-FR' }) } as never)

    const { getLocale } = await import('../locale')
    expect(await getLocale({ userId: null })).toBe('en-US')
  })
})
```

- [ ] **Step 5: Implementar `locale.ts`**

```ts
import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, type Locale, isSupportedLocale } from './messages'

export const LOCALE_COOKIE = 'locale'
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

interface GetLocaleInput {
  userId: string | null
}

export async function getLocale(input: GetLocaleInput): Promise<Locale> {
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { preferredLocale: true },
    })
    if (isSupportedLocale(user?.preferredLocale)) return user.preferredLocale
  }

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value
  if (isSupportedLocale(cookieValue)) return cookieValue

  return DEFAULT_LOCALE
}
```

- [ ] **Step 6: Crear `index.ts` (superficie pública)**

```ts
export { getLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from './locale'
export { t, MESSAGES, LOCALES, DEFAULT_LOCALE, isSupportedLocale } from './messages'
export type { Locale } from './messages'
```

- [ ] **Step 7: Correr tests — verde**

```bash
pnpm vitest run lib/i18n
```

Expected: ambos archivos PASS (5 + 3 = 8 tests).

- [ ] **Step 8: Commit**

```bash
git add lib/i18n/
git commit -m "feat(i18n): getLocale server-side + diccionarios EN/ES + helper t"
```

---

## Task 0.5.3: Switch component + server action

**Files:**
- Modify: `app/(storefront)/_actions.ts` (agregar `setLocaleAction`)
- Create: `components/commerce/LocaleSwitch.tsx`
- Modify: `app/(storefront)/layout.tsx` (renderear switch)

- [ ] **Step 1: Server action `setLocaleAction`**

En `app/(storefront)/_actions.ts`, agregar al final:

```ts
'use server'

// (al inicio del archivo, agregar imports faltantes si los necesita)
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isSupportedLocale } from '@/lib/i18n'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setLocaleAction(formData: FormData): Promise<void> {
  const raw = String(formData.get('locale'))
  if (!isSupportedLocale(raw)) return

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, raw, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // accesible al cliente para preview UI; el server lo lee igual
  })

  const session = await auth()
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredLocale: raw },
    })
  }

  revalidatePath('/', 'layout')
}
```

Si el archivo `_actions.ts` no existe en `app/(storefront)/`, créalo con `'use server'` al tope y solo esta función + los imports necesarios. Si existe pero usa otro encabezado, integrar respetando el existente.

- [ ] **Step 2: Componente switch**

Crear `components/commerce/LocaleSwitch.tsx`:

```tsx
'use client'

import { setLocaleAction } from '@/app/(storefront)/_actions'
import { LOCALES, type Locale, t } from '@/lib/i18n'

export function LocaleSwitch({ current }: { current: Locale }) {
  return (
    <form action={setLocaleAction} className="flex items-center gap-2 text-sm">
      <label htmlFor="locale-select" className="sr-only">
        {t(current, 'localeSwitch.label')}
      </label>
      <select
        id="locale-select"
        name="locale"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
        aria-label={t(current, 'localeSwitch.label')}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {l === 'en-US' ? t(current, 'localeSwitch.en') : t(current, 'localeSwitch.es')}
          </option>
        ))}
      </select>
    </form>
  )
}
```

- [ ] **Step 3: Integrar en storefront layout**

En `app/(storefront)/layout.tsx`:

- Importar `LocaleSwitch` y `getLocale`.
- Resolver locale: `const locale = await getLocale({ userId: userId ?? null })`.
- Renderear `<LocaleSwitch current={locale} />` dentro del `<nav>`, antes de `NotificationBadge` (o `<Link href="/sign-in">` para anónimos).

Mínimo cambio — no romper layout existente.

- [ ] **Step 4: Smoke manual (no automatizado)**

```bash
pnpm dev
```

Visitar `http://localhost:3000/catalog`, ver el dropdown, cambiar a `Español`, verificar que la cookie `locale=es-419` se setea (DevTools → Application → Cookies). Recargar, debe mantener la selección. NO bloquea el commit, es smoke.

- [ ] **Step 5: Gate**

```bash
set -a && . ./.env.local && set +a
pnpm lint:fix && pnpm typecheck && pnpm vitest run lib/i18n && pnpm build
```

Verde.

- [ ] **Step 6: Commit**

```bash
git add app/\(storefront\)/_actions.ts components/commerce/LocaleSwitch.tsx app/\(storefront\)/layout.tsx
git commit -m "feat(i18n): LocaleSwitch en header + server action para persistir preferencia"
```

---

## Cierre Corte 0.5

- [ ] **Gate completo**

```bash
set -a && . ./.env.local && set +a
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Verde. Sin regresión en tests Fase 0-4 Fundación.

- [ ] **ADR 0025**

Escribir `docs/adr/0025-i18n-cookie-vs-routing.md` (template: Context / Decision / Consequences / Alternatives). Decisión: cookie + `User.preferredLocale`, NO routing `/[locale]/...`. Justificación: YAGNI, sin SEO multi-idioma exigido, sin librería externa, cambio mínimo al layout.

Commit: `docs(adr): 0025 i18n cookie-based vs routing per path`.

- [ ] **CHECKPOINT**

Reportar verde. Si el gate pasa limpio, autorización del owner ya está dada para avanzar a Etapa C (Corte 1 — generación de contenido).

---

## Self-Review

**Cobertura spec §14.4:**
- Cookie-based, no routing ✅ (Task 0.5.2 / 0.5.3)
- ADR 0025 ✅ (cierre)
- `User.preferredLocale` para persistir preferencia logueado ✅ (Task 0.5.1)
- Fallback chain user.preferredLocale → cookie → default ✅ (Task 0.5.2 Step 5)

**Placeholders:** ninguno; todo paso lleva código real.

**Consistencia:** `Locale` tipo se exporta desde `lib/i18n/messages.ts` y se reexporta vía `lib/i18n/index.ts`. `isSupportedLocale` se usa en 3 sitios (cookie validation, server action validation, getLocale).

**Scope cut intencional:** sin Accept-Language negociado, sin plurales, sin interpolación; el helper `t` es lookup directo. El Corte 1 puede extender si necesita.

**Ajustes del briefing aplicados:** spec rev2 §14.4 (cookie sobre routing), spec §2.2 (bilingüe desde Corte 1, este Corte 0.5 deja la infra).
