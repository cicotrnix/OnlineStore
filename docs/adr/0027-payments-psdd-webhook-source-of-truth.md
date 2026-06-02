# ADR 0027 — Pagos: webhook firmado como única fuente de verdad (PSDD adaptado)

Fecha: 2026-06-01 (Fase 5 Corte 2)

## Estado

Aceptado.

## Contexto

Stripe Checkout hosted devuelve al cliente una `success_url`. Confiar en ese retorno para marcar la orden pagada es la vulnerabilidad clásica (cliente puede manipular query string, abandonar antes del callback, etc.). Doctrine PSDD prohíbe single-source-of-truth en el cliente.

## Decisión

- **El webhook firmado HMAC es la única fuente de verdad** para marcar `Payment.status=CAPTURED` y decrementar stock.
- Idempotencia en 4 capas: `Payment.idempotencyKey` (UNIQUE), `PaymentEvent.eventId` (UNIQUE), row lock `FOR UPDATE` en la tx de captura, status check `if current === CAPTURED return`.
- Stock decrement vía SQL atómico `UPDATE Product SET stock = stock - $1 WHERE id = $2 AND stock >= $1` — falla si no hay stock.
- Mismatch (monto/moneda) → `Payment.status=NEEDS_REVIEW` + auto-refund (idempotency key `auto-refund-${paymentId}`) + audit + throw `PaymentMismatchError`.
- Wire/ACH: `reconcileWire` con `eventId = wire-${wireReference}` determinístico → idempotente por referencia.
- Refunds: gated por step-up email-OTP + sensitive_action_token (sub-módulo nuevo, ADR 0032). **`refundPayment` solo INICIA el refund** (marca `REFUND_PENDING`, llama Stripe Refund API con idempotency key estable `refund-${paymentId}`). La transición a `REFUNDED` + emisión de `payment.refunded` ocurre exclusivamente cuando llega `charge.refunded` webhook firmado — mismo principio que captura.
- **Reconocimiento de ingreso (accrual)**: `invoice.issued` se emite al colocar la orden (`ordersService.placeOrder`). Para card, el webhook de captura también llama `ensureInvoiceAndEmit` que es idempotente (Invoice.orderId UNIQUE). Esto asegura que Revenue y CxC se posteen aún si el wire instructions email se necesita disparar antes del pago.
- **COGS**: `Product.unitCostCents` (nullable). En cada captura/reconciliación se calcula `cogsCents = Σ(qty × unitCost)`; si todos los productos tienen costo null, `cogsCents=0` y la regla COGS/Inventario salta.
- **Mismatch → AuditLog**: además del log estructurado y `Payment.status=NEEDS_REVIEW`, se escribe una fila en `AuditLog` (append-only) con eventId, sessionId, amounts esperados/recibidos y orderId, para forensics independiente del logger externo.
- Cliente Stripe es interface (`StripeClient`); `FakeStripe` para tests; producción detecta `STRIPE_SECRET_KEY` y reemplaza.

## Consecuencias

- Cero confianza en el cliente. Cero "marcar pagado en success_url".
- 12 tests PSDD §16 obligatorios (ver `docs/psa-checklist.md` §9).
- Las pruebas no requieren Stripe live — el Fake firma HMAC con el mismo formato.

## Alternativas descartadas

- Confirmar en `success_url`: trivialmente explotable.
- Sin row lock: race condition si dos webhooks llegan en paralelo (raro pero posible con replays Stripe).
- Refund sin step-up: violación contable (cualquier admin comprometido puede vaciar caja).
