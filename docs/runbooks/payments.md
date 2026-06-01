# Runbook — Pagos PSDD

## Diario

- Verificar `SELECT status, COUNT(*) FROM "Payment" GROUP BY status;`. Alarma si `NEEDS_REVIEW > 0`.
- Revisar `SELECT * FROM "Payment" WHERE status='NEEDS_REVIEW';` → mismatch detectado por webhook. El auto-refund ya se disparó; documentar y cerrar caso.

## Refund manual (webhook-driven, PSDD)

1. Admin abre `/admin/orders/[id]` → "Refund".
2. Sistema emite step-up token + envía OTP por email (Resend).
3. Admin pega token + OTP → `refundPayment` ejecuta:
   - Valida step-up (5 OTP fallidos bloquean el token).
   - Llama a Stripe Refund API con idempotency key `refund-${paymentId}`.
   - Marca `Payment.status = REFUND_PENDING`. **NO** marca REFUNDED ni emite `payment.refunded` aquí.
4. Stripe envía webhook `charge.refunded` asíncrono (segundos a minutos).
5. `handleStripeWebhook` recibe, verifica firma, transiciona `REFUND_PENDING → REFUNDED` y emite `payment.refunded` (con `restockCents` calculado).
6. Auditoría: buscar `DomainEvent` `payment.refunded` con `aggregateId=paymentId` + `PaymentEvent` `type='charge.refunded'`.

Si el webhook no llega en > 30 min: investigar Stripe Dashboard. El refund ya se inició; reintentar `refundPayment` es seguro (idempotencia estable).

## Wire reconciliation

1. Admin recibe extracto bancario con wire entrante.
2. Admin localiza `Invoice` → ejecuta `reconcileWire({orderId, amountCents, wireReference, adminUserId})` via admin UI o script.
3. Sistema valida monto exacto; mismatch → throw (NO auto-refund, el wire ya entró al banco).
4. Stock se decrementa atómicamente; `payment.reconciled` se emite.
5. Mismo `wireReference` no duplica.

## Rotar STRIPE_WEBHOOK_SECRET

1. Coolify: actualizar var `STRIPE_WEBHOOK_SECRET`.
2. Stripe Dashboard: rotar secret en el endpoint.
3. **No reiniciar** la app entre los dos pasos — el webhook viejo seguirá llegando hasta que Stripe propague el cambio.
4. Verificar logs: ningún `PaymentWebhookInvalidError` post-rotación.

## Stripe Dashboard config

Endpoint: `https://<host>/api/webhooks/stripe`. Eventos:
- `checkout.session.completed` (captura)
- `payment_intent.payment_failed` (FAILED)
- `charge.refunded` (REFUNDED + emite payment.refunded)

Otros eventos son ignorados con `{ ok: true, reason: 'event type ignored' }`.

## Disaster recovery

- `PaymentEvent` es append-only — toda firma + payload + amount permanece. Reconstrucción de auditoría siempre posible.
- Si `Payment` row se corrompe (manual UPDATE), buscar último `PaymentEvent` correspondiente y restaurar status.
