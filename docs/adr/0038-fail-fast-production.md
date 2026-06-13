# ADR 0038 — Fail-fast estricto en producción (sin fakes silenciosos)

Fecha: 2026-06-13

## Estado

Aceptado. Resuelve PAY-2/TST-7 y la mitad de aplicación de LED-1 (P1) de la auditoría `docs/audit/2026-06-12-audit.md`. Decidido por Herney en Cowork (`docs/plans/2026-06-13-decisiones-tensiones-1-2-3.md`, Decisión 3).

## Contexto

La filosofía "deploy inerte sin claves" (noop-safe) es excelente para DX y demos, pero la auditoría mostró que en el camino del dinero es peligrosa:

- **Stripe (PAY-2/TST-7):** si producción arrancaba con las env vars Stripe incompletas, el selector degradaba en silencio al `FakeStripe`, cuyo secreto HMAC por defecto (`'whsec_fake'`) es público en el repo. Cualquiera podía forjar un webhook firmado y marcar pagos `CAPTURED` sin pagar. Además la verificación de firma del fake usaba `!==` (no constant-time).
- **Append-only (LED-1):** el guard del ledger se desactivaba con `APPEND_ONLY_GUARD=off` sin chequear `NODE_ENV`, así que una copia accidental de esa env var a producción desactivaba la protección del libro contable.

## Decisión

**En `NODE_ENV=production`, ningún fake/fallback silencioso en el camino del dinero. No hay path de "prod demo": para demos se usa staging (con claves test-mode).**

- `getStripeClient()`: si faltan `STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET` y `NODE_ENV==='production'` → **throw** al boot, nunca `FakeStripe`. En dev/test se mantiene el fallback al fake (incluso con `payments.stripe.enabled=true`, para poder probar el flujo de tarjeta contra el fake sin claves reales — la "o" del enunciado original se descartó porque rompía ese DX y contradecía "en no-producción mantener el fallback noop").
- `lib/db/client.ts`: `appendOnlyEnforced(nodeEnv, guard)` — el guard append-only **no se puede desactivar en producción**. `APPEND_ONLY_GUARD=off` solo surte efecto fuera de producción (lo necesita `cleanDb`).
- `FakeStripe.verifyWebhook`: comparación de firma con `crypto.timingSafeEqual` (descartando primero por longitud), en vez de `!==`.
- `.env.example`: `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` documentadas como obligatorias en producción, con los eventos que debe enviar el endpoint del Dashboard (`checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`).

## Alcance / lo que NO cubre

- **No resuelve el resto de LED-1.** El hardening a nivel DB (rol Postgres `app_rw`) sigue pendiente: el script `ops/sql/2026-06-01-create-app-rw-role.sql` tiene errores de sintaxis (variable dentro de `DO $$`, `GRANT CONNECT ON DATABASE current_database()`) y nunca se probó contra un Postgres real. Esta decisión cierra la mitad de aplicación (el guard app-level no se puede apagar en prod); la mitad DB sigue su propio plan: corregir el SQL, probarlo local, ejecutarlo pre-launch y migrar `DATABASE_URL` a `app_rw`.
- Los otros adaptadores noop (FedEx, Analytics, Storage, Email) conservan el fallback inerte en producción — no mueven dinero ni firman webhooks de pago.

## Consecuencias

- **Positivas:** imposible operar producción con el `FakeStripe` forjable; el ledger no se puede dejar sin protección por una env var; firma de webhook constant-time.
- **A vigilar:** un deploy de producción al que le falte una clave Stripe **no arranca** (es el comportamiento deseado: falla ruidosa > pago fantasma). El runbook de launch debe listar las `STRIPE_*` como obligatorias.

## Evidencia / verificación

- `lib/stripe/__tests__/fail-fast.test.ts`: prod sin claves → throw; no-prod sin claves → fake; verify rechaza firma de longitud distinta sin lanzar.
- `lib/db/__tests__/append-only-guard.test.ts`: `appendOnlyEnforced('production','off')===true`; `('test','off')===false`.
- `tests/inert-without-keys.test.ts`: actualizado — stripe ahora lanza en producción sin claves (antes caía al fake).
