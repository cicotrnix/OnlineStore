/**
 * Accounting integration test: unified wire payment flow leaves the books
 * consistent after reconcileWire + dispatchPending.
 *
 * Gate (Task 6 — hard requirement):
 *   1. totalDebits === totalCredits (trial balance cuadrado).
 *   2. AR account (1100 / ACCOUNTS_RECEIVABLE) net balance is ZERO after
 *      invoice.issued (Dr 1100) + payment.reconciled (Cr 1100) settle out.
 *   3. Only ONE paymentEvent row exists (idempotency guard holds).
 *   4. Invoice is PAID, Order is CONFIRMED.
 */
import { prisma } from '@/lib/db/client'
import { _resetSubscribers, dispatchPending, registerSubscriber } from '@/modules/events'
import { reconcileWire } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ACCOUNT_CODES } from '../chart'
import { trialBalance } from '../reports'
import { seedChartOfAccounts } from '../seed'
import { accountingSubscriber } from '../subscriber'

// ─── one-time setup ────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb()
  await seedChartOfAccounts()
})

// ─── per-test reset (mirrors integrity.test.ts pattern exactly) ───────────────

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.accountingPeriod.deleteMany()
  await prisma.eventDelivery.deleteMany()
  await prisma.domainEvent.deleteMany()
  await prisma.paymentEvent.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.orderLine.deleteMany()
  await prisma.order.deleteMany()
  await prisma.organizationAddress.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
  _resetSubscribers()
  registerSubscriber(accountingSubscriber)
})

// ─── fixture ──────────────────────────────────────────────────────────────────

async function seedWireScenario(opts: {
  totalCents: number
  unitCostCents?: number
  stock?: number
}) {
  const user = await prisma.user.create({
    data: {
      email: `wire-tb-admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@t.com`,
      isPlatformAdmin: true,
    },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'WireTBOrg',
      slug: `wire-tb-org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creditLimit: new Decimal('10000.00'),
      creditUsed: new Decimal((opts.totalCents / 100).toFixed(2)),
      paymentTerms: 'NET_30',
    },
  })
  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'TB Tester',
      line1: '1 Test St',
      city: 'Testville',
      postalCode: '00000',
      country: 'US',
    },
  })
  const cat = await prisma.category.create({
    data: {
      name: 'TB Cat',
      slug: `tb-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    },
  })
  const product = await prisma.product.create({
    data: {
      sku: `TB-SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slug: `tb-prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'Wire TB Product',
      basePrice: new Decimal((opts.totalCents / 100).toFixed(2)),
      unitCostCents: opts.unitCostCents != null ? BigInt(opts.unitCostCents) : undefined,
      stockQuantity: opts.stock ?? 10,
      categoryId: cat.id,
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `TB-ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'NET_TERMS',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      subtotal: new Decimal((opts.totalCents / 100).toFixed(2)),
      total: new Decimal((opts.totalCents / 100).toFixed(2)),
      currency: 'USD',
      lines: {
        create: [
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: new Decimal((opts.totalCents / 100).toFixed(2)),
            quantity: 1,
            lineTotal: new Decimal((opts.totalCents / 100).toFixed(2)),
          },
        ],
      },
    },
  })
  return { user, org, order, product }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('wire payment — accounting trial-balance invariants', () => {
  it('trial balance CUADRADO: totalDebits === totalCredits after reconcileWire + dispatch', async () => {
    const { user, order } = await seedWireScenario({ totalCents: 10000 })

    await reconcileWire({
      orderId: order.id,
      amountCents: 10000,
      wireReference: `WR-TB-${Date.now()}`,
      adminUserId: user.id,
    })
    await dispatchPending({ batchSize: 50 })

    const tb = await trialBalance()

    // ── HARD GATE: debits === credits ──────────────────────────────────────
    expect(tb.totalDebits).toBe(tb.totalCredits)
  })

  it('AR account (1100) net balance is ZERO after wire payment settles (no fantasma balance)', async () => {
    const { user, order } = await seedWireScenario({ totalCents: 8500 })

    await reconcileWire({
      orderId: order.id,
      amountCents: 8500,
      wireReference: `WR-AR-${Date.now()}`,
      adminUserId: user.id,
    })
    await dispatchPending({ batchSize: 50 })

    const tb = await trialBalance()
    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))

    // ── HARD GATE: AR settled, no fantasma balance ─────────────────────────
    // invoice.issued:       Dr 1100  +8500
    // payment.reconciled:   Cr 1100  -8500
    // net                         =     0
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)
  })

  it('full wire flow: both invariants hold together — AR=0 + trial balance cuadrado + Banco=total', async () => {
    const totalCents = 7000
    const { user, order } = await seedWireScenario({
      totalCents,
      unitCostCents: 3000,
      stock: 5,
    })

    await reconcileWire({
      orderId: order.id,
      amountCents: totalCents,
      wireReference: `WR-FULL-${Date.now()}`,
      adminUserId: user.id,
    })
    await dispatchPending({ batchSize: 50 })

    // Domain events emitted
    const types = (await prisma.domainEvent.findMany()).map((e) => e.type)
    expect(types).toContain('invoice.issued')
    expect(types).toContain('payment.reconciled')

    const tb = await trialBalance()
    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))

    // ── HARD GATE 1: debits === credits ────────────────────────────────────
    expect(tb.totalDebits).toBe(tb.totalCredits)

    // ── HARD GATE 2: AR net zero (CxC settled, no fantasma balance) ────────
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)

    // Cash/Bank debited for wire amount
    expect(byCode.get(ACCOUNT_CODES.CASH_BANK)?.debitCents).toBe(BigInt(totalCents))

    // Revenue side
    expect(byCode.get(ACCOUNT_CODES.SALES_REVENUE)?.creditCents).toBe(BigInt(totalCents))

    // COGS + Inventory offset
    expect(byCode.get(ACCOUNT_CODES.COGS)?.debitCents).toBe(3000n)
    expect(byCode.get(ACCOUNT_CODES.INVENTORY)?.creditCents).toBe(3000n)

    // Order CONFIRMED, Invoice PAID
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe('CONFIRMED')
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(invoice.status).toBe('PAID')
  })

  it('idempotent: double reconcileWire leaves trial balance cuadrado with a single journal entry', async () => {
    const { user, order } = await seedWireScenario({ totalCents: 5000 })
    const wireReference = `WR-IDEM-${Date.now()}`

    await reconcileWire({
      orderId: order.id,
      amountCents: 5000,
      wireReference,
      adminUserId: user.id,
    })
    await dispatchPending({ batchSize: 50 })

    // Second call — must be no-op
    await reconcileWire({
      orderId: order.id,
      amountCents: 5000,
      wireReference,
      adminUserId: user.id,
    })
    await dispatchPending({ batchSize: 50 })

    const tb = await trialBalance()
    expect(tb.totalDebits).toBe(tb.totalCredits)

    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)

    // Only one paymentEvent → only one journal entry for payment.reconciled.
    // PAY-3: eventId es por orden ('wire-' + orderId + '-' + ref).
    const paymentEventCount = await prisma.paymentEvent.count({
      where: { eventId: `wire-${order.id}-${wireReference}` },
    })
    expect(paymentEventCount).toBe(1)
  })
})
