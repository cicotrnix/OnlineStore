# Launch hardening (CC) — rate-limit sign-in + env

> Brief Cowork → Claude Code CLI. Único código pendiente para salir al público. Branch nueva desde `main` actualizado. TDD. Gate verde. Stop-on-red. No mergear.

## A1 — Rate-limit en el sign-in (magic link)

**Problema:** `app/(auth)/sign-in/actions.ts#signInAction` dispara `signIn('resend', …)` (envía email) sin throttle. Expuesto al público = vector de abuso (email bombing, costo Resend). Reusar `lib/rate-limit` (ya existe, misma util que search y AI chat).

**Files:**
- Modify: `lib/rate-limit.ts` (+1 preset), `app/(auth)/sign-in/actions.ts`, `lib/i18n/messages.ts` (+1 key EN/ES)
- Test: `app/(auth)/sign-in/__tests__/actions.test.ts` (existe — agregar casos)

**Diseño:**
- Agregar preset en `lib/rate-limit.ts`: `export const SIGNIN_LIMITS: RateLimitConfig = { perMinute: 3, perHour: 10 }`.
- En `signInAction`, **antes** de llamar `signIn`: leer IP desde `headers()` (patrón exacto de `app/api/ai/chat/route.ts`: `const h = await headers(); const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'`). Chequear `checkRateLimit(\`signin:${ip}:${email}\`, SIGNIN_LIMITS)`. Si `!result.allowed` → `return { ok: false, messageKey: 'auth.toast.rateLimited' }` (no lanzar; es un `ActionResult`, el form ya muestra `toast.error`).
- El check va después de validar que `email` no esté vacío (no gastar cupo en submits vacíos).
- Import: `import { SIGNIN_LIMITS, checkRateLimit } from '@/lib/rate-limit'` + `import { headers } from 'next/headers'`.

**i18n (parity EN/ES obligatoria):** agregar en union type + en-US + es-419:

| key | en-US | es-419 |
|---|---|---|
| `auth.toast.rateLimited` | Too many attempts. Wait a minute and try again. | Demasiados intentos. Esperá un minuto y volvé a intentar. |

**TDD:**
- Mockear `next/headers` (`headers` → `{ get: () => '1.2.3.4' }`) y `@/lib/auth` `signIn` (ya mockeado en el test existente). Importar `resetRateLimits` de `@/lib/rate-limit` y llamarlo en `beforeEach` (evita fuga de estado entre tests).
- Caso nuevo: 3 llamadas con el mismo email/IP pasan; la 4ta en el mismo minuto → `{ ok: false, messageKey: 'auth.toast.rateLimited' }` y `signIn` **no** se llama esa vez.
- Los 3 casos existentes siguen verdes (resetRateLimits evita que se pisen).

## A2 — `STORE_ID` en `.env.example`

**Files:** Modify: `.env.example`

Agregar (con comentario):

```
# Tienda activa. Obligatorio en producción (fail-fast al boot si falta).
# En dev/test, default 'pipower' si no se setea.
STORE_ID=pipower
```

## Aceptación (gate — frenar si algo es rojo)

1. `pnpm format` (Biome).
2. `pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` — verde, incluido el test de paridad EN/ES.
3. Sin tocar `MAINTENANCE_MODE`, schema, adaptadores ni lógica de pagos.
4. Commit(s) chicos: `feat(auth): rate-limit sign-in magic link` + `chore: document STORE_ID in env example`. Push + PR. **No mergear** — review en Cowork.
