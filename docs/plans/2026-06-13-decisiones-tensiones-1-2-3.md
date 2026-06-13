# Decisiones — Tensiones #1, #2, #3 de la auditoría 2026-06-12

> **Para Claude Code CLI.** Decididas por Herney en Cowork el 2026-06-13, tras la auditoría `docs/audit/2026-06-12-audit.md`.
> Estas decisiones desbloquean los fixes PAY-1 (P0), ARQ-1/AI-1 (P1) y PAY-2/LED-1 (P1). Ejecutar contra ellas sin re-elegir. Cada una merece su ADR nuevo (numerar tras el último vigente).

## Decisión 1 — Reserva de stock en `placeOrder` (resuelve el P0 PAY-1)

**Semántica elegida:** el inventario se **reserva al colocar la orden** (`placeOrder`), no al capturar el pago. `placeOrder` es el **punto único** de decremento de stock.

Implementación:
- **Eliminar** el decremento de stock en `handleStripeWebhook` (`modules/payments/service.ts:282-300`) y en `reconcileWire` (`:376-389`). Esos caminos solo deben **validar y confirmar** la orden (transición de estado + asiento contable + emisión de evento), nunca volver a tocar stock.
- `placeOrder` (`modules/orders/service.ts:64-69`) mantiene su decremento atómico con `FOR UPDATE` — es correcto, es el único que queda.
- Añadir el test de reproducción (`docs/audit/2026-06-12/pay1-double-decrement.repro.ts`) a la suite de producción como test de regresión, recorriendo el flujo real `cartService.addItem → placeOrder → reconcileWire`/webhook y asertando que el stock baja **una sola vez**.

**Contrapartida elegida (OPS-1):** como el stock se aparta antes del pago, hay que liberar las órdenes wire impagas para no secuestrar inventario.
- Cron que cancela órdenes en `PENDING_PAYMENT` con **antigüedad > 3 días** (TTL elegido), restaurando stock atómicamente y emitiendo el evento de cancelación correspondiente.
- **Override de admin:** el admin debe poder extender el TTL de una orden concreta (o marcarla "wire en camino") para que el cron no la cancele, cuando un comprador avisa que su transferencia viene en camino. Esto suaviza el riesgo del TTL corto sin alargar el default. Implementarlo como un campo en la orden (p.ej. `paymentDueAt` con default `placedAt + 3 días`, editable desde `/admin/orders/[id]`); el cron compara contra ese campo, no contra `placedAt` fijo.
- Notificar al comprador antes de cancelar (email de recordatorio de pago pendiente) — reutilizar plantilla react-email existente si la hay; si no, P2, no bloquea el fix del P0.

## Decisión 2 — Chatbot público con precio gateado por verificación (resuelve ARQ-1/AI-1)

**Elegido:** el chat sigue **público** (anónimos pueden usarlo), pero el **precio se gatea por verificación**, espejo exacto de la PDP.

Implementación:
- En las 3 tools (`modules/ai/chat/tools.ts:53-63, 87, 112, 134`), gatear `priceResolved`/`basePrice` con la misma lógica que la PDP/catálogo (`showPrice = customerState.kind === 'verified'`). Solo orgs `VERIFIED` reciben precio.
- Anónimos y orgs `PENDING`/`REJECTED` reciben el equivalente a `loginForPrice` (sin número de precio), no el `basePrice` mayorista.
- La **visibilidad** de productos (`filterForOrg`/`filterAccessibleIds`) ya está correcta — **no tocar**. Lo único que falta es gatear el precio.
- Test: `runChat` con `orgId=null` (y con org `PENDING`) **no** debe incluir ningún precio en la respuesta ni en el output de tools. Corregir el test actual que codifica el leak (`modules/ai/chat/__tests__/tools.test.ts:64-70`).
- Cumple ADR 0034:24-25 al pie.

## Decisión 3 — Fail-fast estricto en producción (resuelve PAY-2/LED-1)

**Elegido:** en `NODE_ENV=production`, ningún fake/fallback silencioso. Sin path de "prod demo" — para demos se usa staging. No se introduce `DEMO_MODE`.

Implementación:
- `getStripeClient()` (`lib/stripe/index.ts:185-195`): si `NODE_ENV==='production'` (o `payments.stripe.enabled`) y falta **cualquier** clave Stripe requerida → **throw al boot**. Nunca caer a `FakeStripe` en producción. En no-producción, mantener el fallback noop actual (buen DX).
- `lib/db/client.ts:19`: cuando `NODE_ENV==='production'`, **ignorar o throw** ante `APPEND_ONLY_GUARD=off` — el guard no se puede desactivar en prod.
- `lib/stripe/index.ts:85-93`: cambiar el compare de firma HMAC a `crypto.timingSafeEqual` (hoy usa `!==`).
- Añadir las `STRIPE_*` requeridas a `.env.example` documentadas como obligatorias en prod.
- **No** resuelve el resto de LED-1 (el script SQL `app_rw` roto y su provisión) — eso queda como tarea aparte (corregir sintaxis del script, probar contra Postgres local, ejecutar pre-launch, migrar `DATABASE_URL`). El fail-fast de `APPEND_ONLY_GUARD` es la mitad de aplicación de esta decisión; la otra mitad (hardening a nivel DB) sigue su propio plan.

## Orden de ejecución sugerido

1. Decisión 1 (P0) — primero, es el bloqueante de launch.
2. Decisión 2 (P1) — fix de un archivo.
3. Decisión 3 (P1) — fail-fast + timingSafeEqual.

Un ADR por decisión, commits convencionales separados, TDD (test rojo → fix → verde). No mergear sin gates verdes (`STORE_ID=pipower pnpm build`).
