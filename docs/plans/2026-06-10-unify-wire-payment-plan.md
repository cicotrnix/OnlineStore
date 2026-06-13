# Unificar registro de pago wire — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar tarea por tarea. Pasos con checkbox (`- [ ]`).

**Goal:** Una sola acción atómica e idempotente registra el pago wire y deja consistentes factura (PAID), orden (CONFIRMED), stock, crédito y libro contable — eliminando el split-brain entre `reconcileWire` (Orders) y `markPaid` (Invoices).

**Architecture:** Se extrae un helper compartido `settleInvoiceForPaidOrder(tx, …)` (marca invoice PAID + libera crédito + notifica), idempotente. `reconcileWire` lo llama dentro de su transacción existente. El botón único vive en Invoices y enruta al flujo unificado; Orders pasa a display-only. El helper queda listo para el path de Stripe card.

**Tech Stack:** Next.js 14, Prisma/Postgres, módulos `payments`/`accounts`/`accounting`, bus de eventos (Fase 5), Vitest, Playwright, Biome.

**Spec:** `docs/specs/2026-06-10-unify-wire-payment-settlement-design.md`
**Branch:** `feat/unify-wire-payment` desde `main` actualizado.
**Reglas:** TDD donde se marca. Gate por tarea (`lint && typecheck && test`; build `STORE_ID=pipower pnpm build`). Rojo → STOP. No tocar `MAINTENANCE_MODE`, adaptadores, schema (no hay cambios de schema).

---

## File Structure

- `modules/accounts/invoices.ts` — hoy tiene `markPaid`. Se agrega `settleInvoiceForPaidOrder` (helper) y se retira `markPaid` como export usado por UI.
- `modules/payments/service.ts` — `reconcileWire` llama al helper.
- `app/admin/_actions-fase2.ts` (o donde esté la acción del botón Invoices) — recablear "Mark paid" al flujo unificado.
- `app/admin/orders/[id]/page.tsx` — sacar botón "Conciliar wire", mostrar estado de pago.
- `components/commerce/PaymentBadge.tsx` (nuevo) — badge Pagado/Pendiente reusable.
- `lib/i18n/messages.ts` — labels nuevos.

---

### Task 0: Investigación previa (sin código de feature)

- [ ] **Step 1: Callers de markPaid.** Run: `git grep -n "markPaid" -- 'app/**' 'modules/**' | grep -v __tests__`. Confirmar que el único caller de usuario es la acción del botón de Invoices. Anotar el archivo/acción exactos.
- [ ] **Step 2: Acción del botón Invoices.** Localizar la server action que hoy llama `markPaid` (probablemente en `app/admin/_actions-fase2.ts` o `app/admin/invoices/`). Anotar su firma + cómo obtiene `invoiceId`/referencia.
- [ ] **Step 3: Resolver orderId desde invoice.** Confirmar el campo: `Invoice.orderId` (UNIQUE). Run: `git show origin/main:prisma/schema.prisma | grep -A12 "model Invoice"`.
- [ ] **Step 4: reconcileWire firma + helper de invoice/credit actuales.** Releer `reconcileWire` (modules/payments/service.ts) y `markPaid` (modules/accounts/invoices.ts) para extraer la lógica de invoice PAID + `creditUsed` decrement + notificación `INVOICE_PAID`.
- [ ] **Step 5: Path de Stripe.** `grep -n "handleStripeWebhook\|payment.captured" modules/payments/service.ts` — anotar qué hace hoy con orden/stock (para confirmar que solo falta invoice+credit, que el helper cubrirá a futuro). No se cablea card en este PR.

### Task 1: Helper `settleInvoiceForPaidOrder` (TDD)

**Files:** Modify `modules/accounts/invoices.ts`, Test `modules/accounts/__tests__/settle-invoice.test.ts`.

- [ ] **Step 1: Test que falla** — sembrar (cleanDb) una org con `creditUsed` > 0, una order, su invoice PENDING. Llamar el helper dentro de una tx → invoice PAID, `creditUsed` decrementado por el monto, y segunda llamada = no-op (idempotente, no doble-decrementa).

```ts
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { settleInvoiceForPaidOrder } from '../invoices'

beforeEach(cleanDb)

async function seed() {
  const org = await prisma.organization.create({
    data: { name: 'Acme', slug: `acme-${Date.now()}`, creditUsed: 100 },
  })
  const user = await prisma.user.create({ data: { email: `a-${Date.now()}@t.com` } })
  const order = await prisma.order.create({
    data: { /* campos mínimos según schema: orderNumber, organizationId, placedById, total, currency, status */
      orderNumber: `ORD-T-${Date.now()}`, organizationId: org.id, placedById: user.id,
      total: 40, currency: 'USD', status: 'CONFIRMED',
    },
  })
  const invoice = await prisma.invoice.create({
    data: { number: `IN-T-${Date.now()}`, orderId: order.id, organizationId: org.id,
      amount: 40, status: 'PENDING', dueDate: new Date(), issuedAt: new Date() },
  })
  return { org, user, order, invoice }
}

describe('settleInvoiceForPaidOrder', () => {
  it('marca invoice PAID + libera crédito; idempotente', async () => {
    const { org, order, user } = await seed()
    await prisma.$transaction((tx) =>
      settleInvoiceForPaidOrder(tx, { orderId: order.id, paidById: user.id, reference: 'WX-1' })
    )
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(inv.status).toBe('PAID')
    const o1 = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(o1.creditUsed)).toBe(60) // 100 - 40
    // idempotente
    await prisma.$transaction((tx) =>
      settleInvoiceForPaidOrder(tx, { orderId: order.id, paidById: user.id, reference: 'WX-1' })
    )
    const o2 = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(o2.creditUsed)).toBe(60) // NO doble-decrementa
  })
})
```

- [ ] **Step 2:** Run `pnpm vitest run modules/accounts/__tests__/settle-invoice.test.ts` → FAIL (helper no existe).
- [ ] **Step 3: Implementación** — agregar a `modules/accounts/invoices.ts` (reusar la lógica de `markPaid` + la notificación `dispatch` INVOICE_PAID que ya existe). Pseudocódigo concreto (ajustar nombres a los reales del archivo):

```ts
import type { Prisma } from '@prisma/client'

export async function settleInvoiceForPaidOrder(
  tx: Prisma.TransactionClient,
  input: { orderId: string; paidById: string; reference: string }
): Promise<void> {
  const invoice = await tx.invoice.findUnique({ where: { orderId: input.orderId } })
  if (!invoice) return // sin invoice (no debería pasar tras ensureInvoiceAndEmit), no-op defensivo
  if (invoice.status === 'PAID') return // idempotente: ya settleada
  await tx.invoice.update({
    where: { id: invoice.id },
    data: { status: 'PAID', paidAt: new Date(), paidById: input.paidById, paidNote: input.reference },
  })
  await tx.organization.update({
    where: { id: invoice.organizationId },
    data: { creditUsed: { decrement: invoice.amount } },
  })
  const members = await tx.organizationMember.findMany({
    where: { organizationId: invoice.organizationId }, select: { userId: true },
  })
  if (members.length > 0) {
    const { dispatch } = await import('@/modules/notifications')
    await dispatch({
      userIds: members.map((m) => m.userId), type: 'INVOICE_PAID',
      title: `Factura ${invoice.number} marcada como pagada`,
      body: `Tu factura por $${Number(invoice.amount).toFixed(2)} fue confirmada como pagada.`,
      link: `/invoices/${invoice.id}`, subjectType: 'INVOICE', subjectId: invoice.id,
    })
  }
}
```

- [ ] **Step 4:** Run → PASS. `pnpm typecheck && pnpm test` → verde.
- [ ] **Step 5:** Commit: `feat(payments): settleInvoiceForPaidOrder helper (invoice PAID + credit, idempotent, TDD)`

### Task 2: `reconcileWire` llama al helper (TDD)

**Files:** Modify `modules/payments/service.ts`, Test `modules/payments/__tests__/reconcile-settles-invoice.test.ts`.

- [ ] **Step 1: Test que falla** — sembrar order PENDING_PAYMENT + invoice PENDING + org creditUsed. Llamar `reconcileWire` → Payment CAPTURED, Order CONFIRMED, **Invoice PAID**, **creditUsed liberado**, y un `DomainEvent` `payment.reconciled` PENDING en la outbox. Segunda llamada con misma `wireReference` → idempotente (no cambia nada, no duplica evento).
- [ ] **Step 2:** Run → FAIL (reconcileWire aún no settlea invoice).
- [ ] **Step 3: Implementación** — dentro de la `$transaction` de `reconcileWire`, después de `ensureInvoiceAndEmit(tx, fullOrder)`, agregar:

```ts
const { settleInvoiceForPaidOrder } = await import('@/modules/accounts')
await settleInvoiceForPaidOrder(tx, {
  orderId: order.id,
  paidById: input.adminUserId,
  reference: input.wireReference,
})
```

(El helper es idempotente, así que si la invoice ya estaba PAID no re-libera crédito. La idempotencia global del re-reconcile la da el dedup por `eventId = wire-${reference}` ya existente.)

- [ ] **Step 4:** Run → PASS. Gate verde.
- [ ] **Step 5:** Commit: `feat(payments): reconcileWire also settles invoice + credit (atomic, TDD)`

### Task 3: Acción del botón Invoices → flujo unificado (TDD)

**Files:** Modify la acción localizada en Task 0 (ej. `app/admin/_actions-fase2.ts`), Test correspondiente.

- [ ] **Step 1: Test que falla** — la acción del botón "Mark paid" (recibe `invoiceId` + `reference`) → resuelve `orderId` desde la invoice, toma el monto del total de la invoice, y llama `reconcileWire`. Verificar que tras la acción: invoice PAID + order CONFIRMED + crédito liberado.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementación** — recablear la acción (gate `requirePlatformAdmin` ya existente). En vez de llamar `markPaid`:

```ts
const invoice = await prisma.invoice.findUniqueOrThrow({
  where: { id: invoiceId }, select: { orderId: true, amount: true },
})
const { reconcileWire } = await import('@/modules/payments')
await reconcileWire({
  orderId: invoice.orderId,
  amountCents: decimalToCents(invoice.amount), // helper money existente
  wireReference: reference,
  adminUserId: admin.id,
})
// revalidatePath('/admin/invoices') + toast success
```

- [ ] **Step 4:** Run → PASS. Gate verde.
- [ ] **Step 5:** Commit: `feat(admin): invoices "mark paid" routes to unified wire settlement`

### Task 4: Orders display-only + badge de pago

**Files:** Modify `app/admin/orders/[id]/page.tsx`; Create `components/commerce/PaymentBadge.tsx`.

- [ ] **Step 1:** `PaymentBadge.tsx`: recibe `paymentStatus` (`'CAPTURED' | 'PENDING' | null`) y `locale`; renderiza "Pagado" (verde) si CAPTURED, "Pendiente de pago" (amber) si no. i18n.
- [ ] **Step 2:** En `app/admin/orders/[id]/page.tsx`: **sacar** el form/botón "Conciliar wire" (ya no se registra pago desde Orders). Agregar `<PaymentBadge paymentStatus={payment?.status ?? null} .../>` junto al estado de fulfillment. (La página ya hace `prisma.payment.findUnique` — reusar.)
- [ ] **Step 3:** En `app/(account)/orders/[id]/page.tsx` (vista cliente) y `app/admin/invoices/page.tsx`: mostrar el `PaymentBadge` para que el cliente/admin vean "Pagado" claro.
- [ ] **Step 4:** `pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` → verde.
- [ ] **Step 5:** Commit: `feat(orders): payment status badge; remove duplicate reconcile button from Orders`

### Task 5: i18n

**Files:** Modify `lib/i18n/messages.ts`.

- [ ] **Step 1:** Agregar keys (union type + en-US + es-419, **paridad**): `payment.status.paid` ("Paid"/"Pagado"), `payment.status.pending` ("Payment pending"/"Pendiente de pago"), + cualquier label nuevo del botón/toast de Invoices.
- [ ] **Step 2:** Gate verde (incl. test de paridad EN/ES).
- [ ] **Step 3:** Commit: `feat(i18n): payment status labels (EN/ES parity)`

### Task 6: E2e + integración contable

**Files:** Create/extend `tests/e2e/wire-payment.spec.ts`.

- [ ] **Step 1:** E2e: como admin, marcar una factura PENDING como pagada (referencia) → la factura muestra **PAID**, la orden muestra **Pagado + CONFIRMED**, el crédito de la org baja. Re-apretar → sin cambios (idempotente).
- [ ] **Step 2:** Integración contable (unit/integration, no e2e si es más simple): tras marcar pago, procesar el evento `payment.reconciled` (invocar el subscriber o el script) → `pnpm tsx scripts/trial-balance.ts` (o el report) cuadra y la CxC 1100 queda settleada.
- [ ] **Step 3:** Correr la suite e2e existente → verde (regresión).
- [ ] **Step 4:** Commit: `test(e2e): unified wire payment — invoice+order+credit+ledger consistent`

### Task 7: Gate final + PR

- [ ] **Step 1:** `pnpm format && lint && typecheck && test && STORE_ID=pipower pnpm build` + e2e → verde.
- [ ] **Step 2:** Verificación manual local: marcar factura pagada → orden Pagado/CONFIRMED + factura PAID + crédito liberado; trial-balance cuadra.
- [ ] **Step 3:** Confirmar que **no queda** ningún caller de `markPaid` standalone como acción de usuario (Task 0 Step 1). Si `markPaid` quedó sin uso, dejarlo solo si algún test lo usa, o removerlo.
- [ ] **Step 4:** Push + PR `feat: unify wire payment settlement (invoice+order+credit+ledger atomic)`. Descripción con los hallazgos de Task 0. **No mergear** — review en Cowork.

---

## Notas

- No hay cambios de schema. No hay migración (datos de prueba se borran).
- Idempotencia: helper chequea `invoice.status === 'PAID'`; el re-reconcile global lo cubre el dedup por `eventId = wire-${reference}`.
- El helper queda listo para el path de Stripe card (`handleStripeWebhook`/`payment.captured`) — NO se cablea card en este PR (Stripe se activa aparte con su staging).
- Mantener la notificación `INVOICE_PAID` (el helper la dispara).
- No tocar `MAINTENANCE_MODE`, adaptadores, ni el flujo de magic link/password.
