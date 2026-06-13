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

- `getStripeClient()`: lanza **solo cuando Stripe está realmente en uso**. Condición = `NODE_ENV==='production'` **AND** `payments.stripe.enabled` **AND** sin claves (`stripeFailFastInProd`). Si se cumple → throw al boot/uso, nunca `FakeStripe`. En dev/test se mantiene el fallback al fake (incluso con `enabled=true`, para probar el flujo de tarjeta contra el fake sin claves reales).
  - **Wire-only (Pi-Power al launch):** `stripe.enabled=false` + sin claves + producción → **NO lanza**, cae al Fake. Esto es deliberado: con la tarjeta deshabilitada no existen Payments de Stripe (el endpoint del webhook solo encontraría "unknown payment" → no-op) y `reconcileWire` (el flujo wire) no toca Stripe. Gatear el throw solo por `NODE_ENV` brickearía este launch — por eso la condición incluye `enabled`. La versión inicial usaba el OR del enunciado (`production || enabled`), descartado porque rompía el DX de dev/test; la versión publicada usa el AND `production && enabled`.
- `lib/db/client.ts`: `appendOnlyEnforced(nodeEnv, guard)` — el guard append-only **no se puede desactivar en producción**. `APPEND_ONLY_GUARD=off` solo surte efecto fuera de producción (lo necesita `cleanDb`).
- `FakeStripe.verifyWebhook`: comparación de firma con `crypto.timingSafeEqual` (descartando primero por longitud), en vez de `!==`.
- `.env.example`: `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` documentadas como obligatorias en producción, con los eventos que debe enviar el endpoint del Dashboard (`checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`).

## Alcance / lo que NO cubre

- **No resuelve el resto de LED-1.** El hardening a nivel DB (rol Postgres `app_rw`) sigue pendiente: el script `ops/sql/2026-06-01-create-app-rw-role.sql` tiene errores de sintaxis (variable dentro de `DO $$`, `GRANT CONNECT ON DATABASE current_database()`) y nunca se probó contra un Postgres real. Esta decisión cierra la mitad de aplicación (el guard app-level no se puede apagar en prod); la mitad DB sigue su propio plan: corregir el SQL, probarlo local, ejecutarlo pre-launch y migrar `DATABASE_URL` a `app_rw`.
- Los otros adaptadores noop (FedEx, Analytics, Storage, Email) conservan el fallback inerte en producción — no mueven dinero ni firman webhooks de pago.

## Consecuencias

- **Positivas:** imposible operar producción con el `FakeStripe` forjable; el ledger no se puede dejar sin protección por una env var; firma de webhook constant-time.
- **A vigilar:** un deploy de producción **con `stripe.enabled=true`** al que le falte una clave **falla ruidosamente al usar Stripe** (comportamiento deseado: falla ruidosa > pago fantasma). El runbook debe listar las `STRIPE_*` como obligatorias **cuando se habilite la tarjeta**. El launch wire-only no se ve afectado.

## Evidencia / verificación

- `lib/stripe/__tests__/fail-fast.test.ts`: matriz pura de `stripeFailFastInProd` (prod+enabled+sin-claves → lanza; prod+**disabled**+sin-claves → NO lanza ← caso wire-only; no-prod → nunca lanza) + integración: launch wire-only (prod, `enabled=false`, sin claves) cae al Fake sin lanzar; prod + `enabled=true` sin claves lanza; verify rechaza firma de longitud distinta sin lanzar.
- `lib/db/__tests__/append-only-guard.test.ts`: `appendOnlyEnforced('production','off')===true`; `('test','off')===false`.
- `tests/inert-without-keys.test.ts`: stripe en wire-only (prod + `stripe.enabled=false`, sin claves) cae al Fake (no lanza).
