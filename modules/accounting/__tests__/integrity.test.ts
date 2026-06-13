import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { _resetSubscribers, dispatchPending, registerSubscriber } from '@/modules/events'
import { createCardCheckout, handleStripeWebhook, reconcileWire } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ACCOUNT_CODES } from '../chart'
import { trialBalance } from '../reports'
import { seedChartOfAccounts } from '../seed'
import { accountingSubscriber } from '../subscriber'

beforeAll(async () => {
  await cleanDb()
  await seedChartOfAccounts()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.accountingPeriod.deleteMany()
  await prisma.eventDelivery.deleteMany()
  await prisma.domainEvent.deleteMany()
  _resetSubscribers()
  registerSubscriber(accountingSubscriber)
  _resetStripe()
})

async function makeOrderWithCost(opts: {
  totalCents: number
  unitCostCents: number
  stock: number
}) {
  const user = await prisma.user.create({
    data: { email: `i-${Date.now()}-${Math.random()}@t.com` },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug: `o-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: 'VERIFIED',
    },
  })
  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'M',
      recipient: 'R',
      line1: '1',
      city: 'X',
      postalCode: '0',
      country: 'US',
    },
  })
  const cat = await prisma.category.create({
    data: { slug: `c-${Date.now()}-${Math.random()}`, name: 'C' },
  })
  const product = await prisma.product.create({
    data: {
      sku: `S-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slug: `s-${Date.now()}-${Math.random()}`,
      name: 'P',
      basePrice: new Decimal((opts.totalCents / 100).toFixed(2)),
      unitCostCents: BigInt(opts.unitCostCents),
      stockQuantity: opts.stock,
      categoryId: cat.id,
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'PREPAID',
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
  return { user, org, product, order }
}

describe('integridad contable end-to-end via bus', () => {
  it('card: order → invoice.issued → payment.captured → AR=0, Revenue=total, Stripe-clearing=total, COGS/Inv balanceados', async () => {
    const { order, product } = await makeOrderWithCost({
      totalCents: 5000,
      unitCostCents: 2000,
      stock: 5,
    })
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 5000, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await handleStripeWebhook(body, signature)
    await dispatchPending({ batchSize: 50 })

    const evs = await prisma.domainEvent.findMany({ orderBy: { occurredAt: 'asc' } })
    const types = evs.map((e) => e.type)
    expect(types).toContain('invoice.issued')
    expect(types).toContain('payment.captured')

    const entries = await prisma.journalEntry.findMany()
    expect(entries.length).toBeGreaterThanOrEqual(2)

    const tb = await trialBalance()
    expect(tb.totalDebits).toBe(tb.totalCredits)

    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))
    // CxC: Dr 5000 al invoice, Cr 5000 al payment.captured → saldo 0.
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)
    // Ventas: Cr 5000.
    expect(byCode.get(ACCOUNT_CODES.SALES_REVENUE)?.creditCents).toBe(5000n)
    // Stripe-clearing: Dr 5000.
    expect(byCode.get(ACCOUNT_CODES.STRIPE_CLEARING)?.debitCents).toBe(5000n)
    // COGS: Dr 2000, Inv: Cr 2000.
    expect(byCode.get(ACCOUNT_CODES.COGS)?.debitCents).toBe(2000n)
    expect(byCode.get(ACCOUNT_CODES.INVENTORY)?.creditCents).toBe(2000n)

    // ADR 0036: el stock se reserva en placeOrder; la captura no lo toca. Este
    // fixture crea la orden directo (sin placeOrder), así que el stock no cambia.
    const p = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(p.stockQuantity).toBe(5)
  })

  it('wire: reconcileWire → AR=0 + Banco=total, COGS/Inv si hay costo', async () => {
    const { order } = await makeOrderWithCost({
      totalCents: 7000,
      unitCostCents: 3000,
      stock: 3,
    })
    const admin = await prisma.user.create({
      data: { email: `wa-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    await reconcileWire({
      orderId: order.id,
      amountCents: 7000,
      wireReference: `WR-${Date.now()}`,
      adminUserId: admin.id,
    })
    await dispatchPending({ batchSize: 50 })
    const types = (await prisma.domainEvent.findMany()).map((e) => e.type)
    expect(types).toContain('invoice.issued')
    expect(types).toContain('payment.reconciled')

    const tb = await trialBalance()
    expect(tb.totalDebits).toBe(tb.totalCredits)
    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)
    expect(byCode.get(ACCOUNT_CODES.CASH_BANK)?.debitCents).toBe(7000n)
    expect(byCode.get(ACCOUNT_CODES.COGS)?.debitCents).toBe(3000n)
    expect(byCode.get(ACCOUNT_CODES.INVENTORY)?.creditCents).toBe(3000n)
  })

  it('refund card via webhook: Revenue neto = 0, CxC = 0, Stripe-clearing = 0, COGS/Inv = 0', async () => {
    const { order } = await makeOrderWithCost({
      totalCents: 5000,
      unitCostCents: 2000,
      stock: 5,
    })
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const cap = {
      id: `evt_cap_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 5000, currency: 'usd' } },
    }
    const sgn1 = _getFakeStripe()._signPayload(cap)
    await handleStripeWebhook(sgn1.body, sgn1.signature)
    await dispatchPending({ batchSize: 50 })

    const ref = {
      id: `evt_ref_${Date.now()}`,
      type: 'charge.refunded',
      data: { object: { payment_intent: payment.stripeIntentId, amount_refunded: 5000 } },
    }
    const sgn2 = _getFakeStripe()._signPayload(ref)
    await handleStripeWebhook(sgn2.body, sgn2.signature)
    await dispatchPending({ batchSize: 50 })

    const tb = await trialBalance()
    expect(tb.totalDebits).toBe(tb.totalCredits)
    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))
    // Stripe-clearing: Dr 5000 capture + Cr 5000 refund → 0.
    expect(byCode.get(ACCOUNT_CODES.STRIPE_CLEARING)?.balanceCents).toBe(0n)
    // Inventario: Cr 2000 capture + Dr 2000 restock → 0.
    expect(byCode.get(ACCOUNT_CODES.INVENTORY)?.balanceCents).toBe(0n)
    // COGS: Dr 2000 capture + Cr 2000 restock-reversal → 0.
    expect(byCode.get(ACCOUNT_CODES.COGS)?.balanceCents).toBe(0n)
    // Ventas (4000) Cr 5000. Devoluciones (4100) Dr 5000. Revenue neto = 0.
    expect(byCode.get(ACCOUNT_CODES.SALES_REVENUE)?.creditCents).toBe(5000n)
    expect(byCode.get(ACCOUNT_CODES.SALES_RETURNS)?.debitCents).toBe(5000n)
    const revenue = byCode.get(ACCOUNT_CODES.SALES_REVENUE)!
    const returns = byCode.get(ACCOUNT_CODES.SALES_RETURNS)!
    expect(returns.debitCents - revenue.creditCents).toBe(0n) // Revenue neto = 0
    // CxC: Dr 5000 invoice + Cr 5000 capture = 0 (el refund NO toca CxC ahora).
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)
  })

  it('refund WIRE: acredita Banco (no Stripe-clearing), Revenue neto = 0, CxC = 0', async () => {
    const { order } = await makeOrderWithCost({
      totalCents: 7000,
      unitCostCents: 3000,
      stock: 3,
    })
    const admin = await prisma.user.create({
      data: { email: `wra-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    await reconcileWire({
      orderId: order.id,
      amountCents: 7000,
      wireReference: `WR-${Date.now()}`,
      adminUserId: admin.id,
    })
    await dispatchPending({ batchSize: 50 })

    // Refund de wire: no hay webhook automático. Admin emite payment.refunded manualmente.
    // Sin step-up real porque ese flow lo cubre payments tests; aquí verificamos
    // sólo el efecto contable del evento con method='WIRE'.
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const { emitEvent } = await import('@/modules/events')
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'payment.refunded',
        aggregateType: 'Payment',
        aggregateId: payment.id,
        payload: {
          orderId: order.id,
          amountCents: 7000,
          currency: 'USD',
          method: 'WIRE',
          restockCents: 3000,
        },
      })
    })
    await dispatchPending({ batchSize: 50 })

    const tb = await trialBalance()
    expect(tb.totalDebits).toBe(tb.totalCredits)
    const byCode = new Map(tb.rows.map((r) => [r.accountCode, r]))
    // Banco: Dr 7000 reconcile + Cr 7000 refund → 0.
    expect(byCode.get(ACCOUNT_CODES.CASH_BANK)?.balanceCents).toBe(0n)
    // Stripe-clearing NO debe estar tocado por el refund WIRE.
    expect(byCode.get(ACCOUNT_CODES.STRIPE_CLEARING)?.balanceCents ?? 0n).toBe(0n)
    // Revenue neto = 0.
    expect(byCode.get(ACCOUNT_CODES.SALES_REVENUE)?.creditCents).toBe(7000n)
    expect(byCode.get(ACCOUNT_CODES.SALES_RETURNS)?.debitCents).toBe(7000n)
    // CxC: Dr 7000 invoice + Cr 7000 reconcile = 0; refund no toca CxC.
    expect(byCode.get(ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)?.balanceCents).toBe(0n)
    // Inventario + COGS net 0.
    expect(byCode.get(ACCOUNT_CODES.INVENTORY)?.balanceCents).toBe(0n)
    expect(byCode.get(ACCOUNT_CODES.COGS)?.balanceCents).toBe(0n)
  })
})
