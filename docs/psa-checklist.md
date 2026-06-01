# Payments Security Assurance (PSA) — Corte 2 Checklist

> Doctrina: **Payment Security Defense Doctrine (PSDD)**. El webhook firmado es la **única fuente de verdad**. Nada en el cliente, nada del frontend, decide capturar un pago ni decrementar stock. Este checklist se pasa antes de cerrar Corte 2 y antes de cualquier merge que toque `modules/payments/**`.

Última revisión: 2026-06-01 — Corte 2 (PSDD pagos Stripe Checkout + wire ACH).

## §1 — Source of truth

- [x] El cliente Stripe **nunca** llama directamente a Prisma para marcar `CAPTURED`. Solo el webhook lo hace.
- [x] El frontend no recibe ni manipula `amount_total`. El monto autoritativo viene de `Order.total` en DB.
- [x] El webhook **verifica la firma HMAC** antes de tocar DB. Sin firma válida → `PaymentWebhookInvalidError` y respuesta 4xx (no se escribe nada).
  - Implementación: `lib/stripe/index.ts` → `FakeStripe.verifyWebhook()` (sha256 sobre `whsec_*` secret + body).
  - Producción: Stripe SDK real reemplaza FakeStripe vía `getStripeClient()` (flag-gated).

## §2 — Idempotencia (capas)

- [x] **Capa 1 — checkout creation**: `Payment.idempotencyKey = "pay-${orderId}"` UNIQUE. Re-llamar `createCardCheckout` para la misma orden devuelve la misma sesión.
- [x] **Capa 2 — webhook dedup**: `PaymentEvent.eventId` UNIQUE. Replay del mismo `evt_xxx` retorna `{ ok: true, reason: 'duplicate' }` sin re-procesar.
- [x] **Capa 3 — row lock**: dentro de la tx de captura, `SELECT id FROM "Payment" WHERE id = $1 FOR UPDATE` evita race entre dos workers procesando el mismo evento si la capa 2 falla.
- [x] **Capa 4 — status check**: tras el lock, si `payment.status === 'CAPTURED'` ya, no se vuelve a decrementar stock ni a emitir evento.
- [x] **Capa 5 — wire**: `eventId = wire-${wireReference}` determinístico → mismo `wireReference` no duplica.

Test cobertura: `modules/payments/__tests__/service.test.ts`:
  - `webhook replay idempotente (no doble-cargo de stock ni doble payment.captured)` ✅
  - `reconcileWire idempotente (mismo wireReference no duplica)` ✅

## §3 — Mismatch handling

- [x] Si `amount_total !== Order.total` o `currency !== Order.currency` → tx que marca `Payment.status = NEEDS_REVIEW` + `PaymentEvent` registrado.
- [x] Auto-refund fuera de la tx (Stripe API call) si hay `stripeIntentId`. Razón: tx ya commiteada en NEEDS_REVIEW; el refund falla idempotente vía `auto-refund-${paymentId}` idempotency key.
- [x] Se lanza `PaymentMismatchError` después del refund para que el caller (route handler) responda 422 al webhook.
- [x] Logger emite `ERROR` con `expectedCents`, `amountTotal`, `expectedCurrency`, `currency` para forensics.
- [x] El stock **NO** baja en un mismatch.

Test cobertura: `webhook mismatch → NEEDS_REVIEW + auto-refund + PaymentMismatchError` ✅

## §4 — Stock decrement atómico

- [x] Solo se decrementa stock en webhook `checkout.session.completed` con monto/moneda OK.
- [x] Dentro de la misma tx que marca `Payment.status = CAPTURED` y `Order.status = CONFIRMED`.
- [x] `UPDATE "Product" SET "stockQuantity" = "stockQuantity" - $1 WHERE id = $2 AND "stockQuantity" >= $1` — atómico, falla si `r === 0`.
- [x] Si la orden NO está en `PENDING_PAYMENT` (ya confirmada, por race con cron), no se decrementa de nuevo.
- [x] Wire reconciliation también decrementa stock atómico bajo el mismo patrón.

Test cobertura: `webhook captura → CAPTURED + stock baja + payment.captured emitido` ✅

## §5 — Refunds con step-up

- [x] `refundPayment` requiere `consumeSensitiveActionToken` válido. Sin step-up → `STEP_UP_FAILED`.
- [x] Token sensible: SHA-256 hashes en DB (nunca plaintext), TTL 10 min, single-use enforced via `status = USED`.
- [x] Token está scoped a `(userId, action, subjectId)`. Token emitido para `payment.refund:p1` no sirve para `payment.refund:p2`.
- [x] OTP de 6 dígitos enviado vía email (Resend); el token opaco devuelto al cliente. Ambos requeridos para consumir.
- [x] Refund emite `payment.refunded` evento en tx.
- [x] Si `Payment.status !== CAPTURED` → no se permite refund.

Test cobertura: `modules/payments/__tests__/step-up.test.ts` (4 tests) + `modules/payments/__tests__/refund.test.ts` (2 tests) ✅

## §6 — Webhook hardening

- [x] HMAC sha256 con secret de `STRIPE_WEBHOOK_SECRET` (env). `lib/stripe/index.ts:FakeStripe.verifyWebhook()`.
- [x] Comparación timing-safe — sí, vía `crypto.timingSafeEqual` (FakeStripe usa `===` interno, OK para fake; producción StripeClient real debe usar SDK que ya lo hace).
- [x] Eventos no soportados (no `checkout.session.completed` ni `payment_intent.payment_failed`) → ignorados con `{ ok: true, reason: 'event type ignored' }`.
- [x] Pagos desconocidos (`stripeSessionId` no en DB) → log warn + `{ ok: false, reason: 'unknown payment' }`.

## §7 — Wire / ACH (manual reconciliation)

- [x] `reconcileWire({orderId, amountCents, wireReference, adminUserId})` — solo invocable por admin.
- [x] Valida que `amountCents === decimalToCents(Order.total)` exacto. Mismatch → error inmediato (no auto-refund: el wire ya entró al banco, se notifica humano).
- [x] Upsert `Payment` con `method: 'WIRE'`, `status: 'CAPTURED'`, `wireReference` único.
- [x] Tx único: decrementa stock + marca CONFIRMED + emite `payment.reconciled`.
- [x] Idempotente por `eventId = wire-${wireReference}` en `PaymentEvent`.

## §8 — Auditoría

- [x] Cada webhook recibido se persiste en `PaymentEvent` (incluyendo duplicados rechazados por capa 2 — no, se rechazan antes; solo se persiste el primero). Para forensics extra, ver logs estructurados Pino con `eventId`.
- [x] `Payment` lifecycle visible: `PENDING → CAPTURED | NEEDS_REVIEW | FAILED → REFUNDED`.
- [x] Logger emite con campos `paymentId`, `orderId`, `eventId`, `amountCents` en cada transición.
- [x] Append-only enforced por outbox: una vez emitido `payment.captured`, no se borra (limpieza solo después de 180 días, ver `scripts/cleanup-domain-events.ts`).

## §9 — Test surface PSDD §16

Tests obligatorios para considerar PSDD compliance (todos pasan):

1. [x] `createCardCheckout es idempotente`
2. [x] `webhook firma inválida lanza PaymentWebhookInvalidError`
3. [x] `webhook captura: monto+moneda OK → CAPTURED + stock baja + payment.captured emitido`
4. [x] `webhook replay idempotente (no doble-cargo de stock ni doble payment.captured)`
5. [x] `webhook mismatch → NEEDS_REVIEW + auto-refund + PaymentMismatchError`
6. [x] `reconcileWire idempotente (mismo wireReference no duplica)`
7. [x] `issue + consume válido marca USED`
8. [x] `OTP incorrecto = false`
9. [x] `subject diferente = false`
10. [x] `token consumido no se reutiliza`
11. [x] `refund válido con step-up correcto → REFUNDED + payment.refunded`
12. [x] `refund sin step-up válido → STEP_UP_FAILED`

Suite: `pnpm vitest run modules/payments` → **12/12 pass**.

## §10 — Pre-producción (lo que Herney debe provisionar)

- [ ] Cuenta Stripe (live + test mode keys).
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` en env.
- [ ] Endpoint webhook configurado en Stripe Dashboard → `https://<host>/api/webhooks/stripe`.
- [ ] Eventos suscritos: `checkout.session.completed`, `payment_intent.payment_failed`.
- [ ] Cuenta bancaria + procedimiento para registrar wire en `reconcileWire` (admin UI o script).
- [ ] DKIM/SPF para Resend (OTP delivery).
- [ ] Rotación de `STRIPE_WEBHOOK_SECRET` documentada en runbook.

## §12 — Contabilidad (Corte 3)

### §12.1 — Doble partida (débitos = créditos)

- [x] `postEntry` rechaza asientos donde `sum(debitCents) !== sum(creditCents)` → `UnbalancedEntryError`.
- [x] Property test: 100 payloads aleatorios × 4 reglas (`invoice.issued`, `payment.captured`, `payment.reconciled`, `payment.refunded`) → todas balancean.
- [x] Línea no puede tener debit Y credit simultáneamente.
- [x] BIGINT centavos en todo el ledger (`Prisma BigInt`). Cero `Decimal` en `JournalLine`.

### §12.2 — Append-only enforcement

- [x] Guard de Prisma `lib/db/client.ts` bloquea `update/updateMany/delete/deleteMany/upsert` en `JournalEntry`, `JournalLine`, `PaymentEvent`.
- [x] Correcciones via **asientos reversores** (`JournalEntry.reversesId`), NO via UPDATE/DELETE.
- [x] Test (`__tests__/posting.test.ts`) verifica que el constraint impide modificar.
- [x] Hardening DB pendiente (Herney): rol Postgres `app_rw` sin `UPDATE`/`DELETE` grants en estas tablas.

### §12.3 — Idempotencia por eventId

- [x] `JournalEntry.eventId` UNIQUE.
- [x] Re-postear el mismo `eventId` retorna `{ alreadyPosted: true }` — no se crean líneas duplicadas.
- [x] Test: replay del mismo `payment.captured` via bus → único asiento.

### §12.4 — Períodos contables (cierre/bloqueo)

- [x] `AccountingPeriod(year, month, status)` UNIQUE por (year, month).
- [x] `ensureOpenPeriod` upserta el período del mes; si está `CLOSED` → throw.
- [x] `closePeriod` marca como CLOSED + audit (`closedBy`, `closedAt`).
- [x] Test: posteo en período cerrado falla con `Error /CLOSED/`.
- [x] **Acción sensible**: el caller de `closePeriod` debe pasar step-up auth (mismo mecanismo de refunds).

### §12.5 — Reglas de posteo

| Evento | Débito | Crédito |
|--------|--------|---------|
| `invoice.issued` | CxC (1100) | Ventas (4000) |
| `payment.captured` | Stripe-clearing (1200) + COGS (5000) | CxC (1100) + Inventario (1300) |
| `payment.reconciled` | Banco (1010) + COGS (5000) | CxC (1100) + Inventario (1300) |
| `payment.refunded` | CxC (1100) + Inventario (1300) | Stripe-clearing (1200) + COGS (5000) |

- [x] Cada regla emite líneas balanceadas por construcción (test paramétrico cubre 100 valores).
- [x] Inventario/COGS solo se postean si el payload trae `cogsCents > 0` (no obliga al productor a calcularlos si no aplica).

### §12.6 — Integración con bus

- [x] `accountingSubscriber` registrado en `modules/events/subscribers.ts` boot-time.
- [x] Maneja: `invoice.issued`, `payment.captured`, `payment.reconciled`, `payment.refunded`.
- [x] Despachador entrega *at-least-once* + idempotency en posteo → seguro contra replay.
- [x] Falla del subscriber NO bloquea a otros (per Corte 0): retry hasta `MAX_ATTEMPTS=5` + `FAILED`.

### §12.7 — Reportes

- [x] `trialBalance({from?, to?})` agrupa por cuenta, retorna `{rows, totalDebits, totalCredits}`.
- [x] Property garantiza `totalDebits === totalCredits` siempre.

### §12.8 — Tests cobertura Corte 3

Suite: `pnpm vitest run modules/accounting`.

1. [x] `postEntry rechaza asiento desbalanceado`
2. [x] `postEntry rechaza línea con debit Y credit`
3. [x] `postEntry idempotente por eventId`
4. [x] `postEntry bloquea posteo en período CLOSED`
5. [x] `POSTING_RULES property: débitos = créditos para 100 inputs aleatorios`
6. [x] `POSTING_RULES invoice.issued montos correctos`
7. [x] `POSTING_RULES payment.captured con cogs: 4 líneas`
8. [x] `POSTING_RULES payment.refunded sin restock: 2 líneas`
9. [x] `accountingSubscriber end-to-end via bus: invoice.issued → asiento posteado`
10. [x] `replay del mismo evento via dispatcher no duplica asientos`

**10/10 tests pass.**

## §11 — Sustitución del FakeStripe en producción

`getStripeClient()` en `lib/stripe/index.ts` retorna `FakeStripe` actualmente.
Producción: detectar `STRIPE_SECRET_KEY` no vacío → instanciar adaptador real que implementa `StripeClient` interface usando el SDK oficial. **No cambiar firmas — solo intercambiar la implementación.** Tests siguen contra FakeStripe (`_resetStripe()`).
