# ADR 0036 — Reserva de stock en `placeOrder` (punto único) + ventana de pago

Fecha: 2026-06-13

## Estado

Aceptado. Resuelve el P0 PAY-1 y la contrapartida OPS-1 de la auditoría `docs/audit/2026-06-12-audit.md`. Decidido por Herney en Cowork (`docs/plans/2026-06-13-decisiones-tensiones-1-2-3.md`, Decisión 1).

## Contexto

La auditoría 2026-06-12 reprodujo un **doble decremento de stock** por cada orden pagada: `placeOrder` (`modules/orders/service.ts`) descontaba el inventario y dejaba la orden en `PENDING_PAYMENT`; después, tanto `handleStripeWebhook` (captura de tarjeta) como `reconcileWire` (conciliación de transferencia) volvían a descontar al ver ese mismo estado. El guard `if (status === 'PENDING_PAYMENT')` no protegía, porque `placeOrder` deja exactamente ese estado. Toda la suite estaba verde porque los fixtures de pago creaban la orden con `prisma.order.create`, saltándose `placeOrder`.

Había dos semánticas posibles: reservar el inventario al **colocar** la orden, o descontarlo solo al **capturar** el pago.

## Decisión

**El stock se reserva al colocar la orden. `placeOrder` es el punto ÚNICO de decremento.**

- `placeOrder` mantiene su decremento atómico (`FOR UPDATE` + `decrement`) — es el único que queda.
- `handleStripeWebhook` y `reconcileWire` **ya no tocan stock**: solo transicionan la orden a `CONFIRMED`, emiten eventos y postean al ledger.
- Cada orden lleva `Order.paymentDueAt` (nullable), fijado en `placeOrder` a `placedAt + 3 días`.

**Contrapartida (OPS-1):** como el stock se aparta antes del pago, hay que liberar las órdenes wire impagas.

- Cron `scripts/cancel-stale-pending-orders.ts` → `ordersService.cancelStalePendingOrders()`: cancela órdenes `PENDING_PAYMENT` con `paymentDueAt < now`, restaura stock atómicamente y emite `order.cancelled`. Cadencia sugerida: diaria.
- **Override de admin:** `extendPaymentDue` (acción `extendPaymentDueAction`, botón "Wire en camino (+7 días)" en `/admin/orders/[id]`) pospone el vencimiento de una orden concreta cuando el comprador avisa que su transferencia viene en camino. El cron compara contra `paymentDueAt`, no contra un `placedAt` fijo.
- Punto único de cancelación: `cancelOrderInTx` (restaura stock + `CANCELLED` + emite `order.cancelled`) lo usan tanto el admin (`cancel`) como el cron.

**Evento nuevo:** `order.cancelled` se agrega al contrato (`modules/events/contract.ts`) y al suscriptor de analytics (consumidor real, no tipo muerto). El suscriptor de email no lo maneja por ahora.

## Consecuencias

- **Positivas:** integridad de inventario correcta (un decremento por orden); cancelar una orden restaura stock exactamente una vez; el TTL de pago evita que órdenes wire abandonadas secuestren inventario; trazabilidad de cancelaciones vía `order.cancelled` en analytics.
- **A vigilar:** entre `placeOrder` y el pago, el stock físico ya está apartado pero la orden no está confirmada (ventana de 3 días por defecto). El override de admin suaviza el riesgo de cancelar a un comprador legítimo con wire lento.
- **Pendiente (P2, no bloquea):** email de recordatorio de pago antes de cancelar (reutilizando plantilla react-email). Y la recomendación de la auditoría de que **todo** test de pago construya la orden vía `placeOrder` (hoy los fixtures directos asertan "la captura no toca stock", que es el invariante nuevo; la cobertura del flujo real vive en `modules/payments/__tests__/stock-single-decrement.test.ts`).

## Evidencia / verificación

- Regresión del flujo real: `modules/payments/__tests__/stock-single-decrement.test.ts` (wire + card → stock baja una sola vez; `paymentDueAt ≈ placedAt + 3d`).
- Cron OPS-1: `modules/orders/cancel-stale.test.ts` (cancela vencida + restaura stock + emite evento; respeta override futuro; no toca CONFIRMED).
- Migración: `prisma/migrations/20260613013500_add_order_payment_due_at`.
