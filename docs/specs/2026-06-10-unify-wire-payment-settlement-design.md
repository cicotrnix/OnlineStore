# Spec — Unificar el registro de pago wire (Orders + Invoices)

> Estado: aprobada en brainstorming Cowork (2026-06-10). Pendiente: plan de implementación.
> Bug encontrado en el smoke: hay **dos mecanismos desconectados** para marcar un pago, cada uno hace la mitad → inconsistencia y riesgo contable.

## 1. Contexto — el problema (split-brain Fase 2 / Fase 5)

Dos acciones, dos pantallas, ninguna completa:

| | `reconcileWire` (Orders → "Conciliar wire", Fase 5) | `markPaid` (Invoices → "Mark paid", Fase 2) |
|---|---|---|
| Payment → CAPTURED | ✅ | ❌ |
| Orden → CONFIRMED + baja stock | ✅ | ❌ |
| Settlea la CxC en el ledger (`payment.reconciled`) | ✅ | ❌ |
| Invoice.status → PAID | ❌ | ✅ |
| Libera crédito (`creditUsed`) | ❌ | ✅ |
| Notifica al cliente (INVOICE_PAID) | ❌ | ✅ |

Riesgo real: marcar pagado en Invoices deja el **ledger sin settlear** (libros muestran plata por cobrar ya cobrada); conciliar en Orders deja la **factura PENDING + crédito no liberado**. Ningún botón solo deja todo consistente.

## 2. Decisión

**Una sola acción canónica de "registrar pago", atómica e idempotente**, que hace las 5 cosas. **Un solo botón**, en **Invoices → "Mark paid"** (lugar natural de cuentas por cobrar). Orders pasa a **display-only** (se saca el botón duplicado). Como orden y factura son 1:1, ambas pantallas reflejan siempre el mismo estado porque una sola operación las mueve juntas.

Sin migración: **todos los datos actuales son de prueba y se borran antes de lanzar.**

## 3. Diseño

### 3.1 Backend unificado

Extender `reconcileWire(input: { orderId, amountCents, wireReference, adminUserId })` (modules/payments/service.ts) para que su transacción, además de lo que ya hace (Payment CAPTURED + Order CONFIRMED + stock + emit `payment.reconciled`), llame a un **helper compartido** que:
- Marca la **Invoice → PAID** (`paidAt`, `paidById`, `paidNote` = referencia).
- Decrementa `Organization.creditUsed` por el monto de la factura.
- Dispara la notificación `INVOICE_PAID`.

Helper nuevo `settleInvoiceForPaidOrder(tx, { orderId, paidById, reference })` en `modules/accounts` (o `modules/payments`), idempotente (si la invoice ya está PAID, no re-decrementa crédito ni re-notifica). Se invoca desde `reconcileWire` (wire) y queda listo para el path de **Stripe card** (`handleStripeWebhook`/`payment.captured`) cuando se active — así la tarjeta hereda la misma consistencia (hoy tendría el mismo bug).

`markPaid` standalone (Fase 2) **se retira como acción de usuario**: la lógica de invoice+credit vive ahora en el helper, llamada solo desde el flujo de pago. Se elimina/oculta el botón "Mark paid" que no settlea el ledger.

### 3.2 Idempotencia y atomicidad

- Todo en **una `prisma.$transaction`**. Si algo falla, no queda mitad hecho.
- El `payment.reconciled` ya es idempotente por `eventId = wire-${reference}` (dedup del bus). Re-apretar con la misma referencia no doble-postea ni doble-cobra.
- El helper chequea el estado actual de la invoice: si ya está PAID, no re-libera crédito ni re-notifica.
- Validación de monto: el monto lo provee el sistema (= total de la factura/orden), no se tipea → sin fat-finger. Si en el futuro se permite editar, mantener el guard de mismatch existente (`PaymentMismatchError`).

### 3.3 UI

- **Invoices (`/admin/invoices`):** "Mark paid" pide la **referencia** (input ya existe); el monto sale del total de la factura. Al confirmar, resuelve `orderId` desde la invoice y llama al backend unificado. Estado PAID/PENDING en la lista.
- **Orders (`/admin/orders/[id]`):** se **saca** el botón "Conciliar wire". Se muestra el **estado de pago** (Pagado / Pendiente de pago, derivado de `Payment.status`) además del estado de fulfillment.
- **Badge de pago** claro y reusable en orden y factura (Pagado / Pendiente de pago).
- i18n EN/ES con paridad para los labels nuevos.

## 4. Alcance / No-alcance

**Incluye:** backend unificado + helper compartido; UI en Invoices; Orders display-only + badge de pago; retiro del `markPaid` standalone como acción; i18n; tests.

**No incluye:** activación de Stripe (separada; el helper queda listo pero el path de card se cablea cuando se encienda Stripe con su staging); pagos parciales (un pago = factura completa); migración de datos (todo prueba).

## 5. Testing (TDD)

- **Unit:** marcar pago (vía la acción de Invoices) → en una tx: Payment CAPTURED + Order CONFIRMED + Invoice PAID + `creditUsed` decrementado + evento `payment.reconciled` emitido. Idempotente: segunda llamada con misma referencia no cambia nada (no doble-decrementa crédito, no doble-postea). `settleInvoiceForPaidOrder` aislado: marca invoice + crédito; segunda llamada no-op.
- **Integración contable:** tras marcar pago, procesar el evento → el `trial-balance` cuadra y la CxC (1100) queda settleada (no quedan saldos por cobrar fantasma).
- **E2e:** admin marca una factura como pagada → la factura muestra PAID, la orden muestra CONFIRMED + "Pagado", el crédito se libera. Re-apretar no rompe nada.
- **Regresión:** suite existente verde.

## 6. Criterios de aceptación

1. Marcar pago desde Invoices deja **factura PAID + orden CONFIRMED/Pagado + crédito liberado + ledger settleado**, todo en una operación.
2. Imposible el estado inconsistente "factura pagada / orden sin pagar" (y viceversa).
3. Idempotente: re-marcar con la misma referencia no doble-cobra ni doble-postea.
4. Orders ya no tiene botón duplicado; muestra el estado de pago.
5. El helper `settleInvoiceForPaidOrder` es reusable por el path de card (Stripe) sin cambios.
6. Gate verde: `format && lint && typecheck && test && STORE_ID=pipower build` + e2e. Paridad EN/ES. `MAINTENANCE_MODE`/adaptadores sin tocar.

## 7. Riesgos / notas

- El ledger ya se settlea vía evento (async, cron). El **invoice PAID + crédito** se hacen **sincrónicos** en la tx de `reconcileWire` (instantáneos en la UI), consistente con que la orden ya se confirma sincrónica.
- Confirmar que retirar el `markPaid` standalone no rompe otros llamadores (buscar usos; el único es el botón de Invoices, que se recablea al flujo unificado).
- Mantener la notificación `INVOICE_PAID` (no perder el aviso al cliente que daba el flujo Fase 2).
