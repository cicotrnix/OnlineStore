import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { PaymentMismatchError } from '../errors'
import { createCardCheckout, handleStripeWebhook, reconcileWire } from '../service'

async function makeOrder(opts: { totalCents: number; stock?: number } = { totalCents: 5000 }) {
  const user = await prisma.user.create({ data: { email: `p-${Date.now()}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: 'P',
      slug: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      stockQuantity: opts.stock ?? 10,
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

beforeEach(async () => {
  await cleanDb()
  _resetStripe()
})

describe('payments PSDD', () => {
  it('createCardCheckout es idempotente', async () => {
    const { order } = await makeOrder({ totalCents: 5000 })
    const a = await createCardCheckout({
      orderId: order.id,
      successUrl: 'http://s',
      cancelUrl: 'http://c',
    })
    const b = await createCardCheckout({
      orderId: order.id,
      successUrl: 'http://s',
      cancelUrl: 'http://c',
    })
    expect(a.paymentId).toBe(b.paymentId)
  })

  it('webhook firma inválida lanza PaymentWebhookInvalidError', async () => {
    await expect(handleStripeWebhook('{}', 'bad-sig')).rejects.toThrow(/Invalid/i)
  })

  it('webhook captura: monto+moneda OK → CAPTURED + stock baja + payment.captured emitido', async () => {
    const { order, product } = await makeOrder({ totalCents: 5000, stock: 5 })
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })

    const event = {
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 5000, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    const r = await handleStripeWebhook(body, signature)
    expect(r.ok).toBe(true)

    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('CAPTURED')
    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(o.status).toBe('CONFIRMED')
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    // ADR 0036: stock reservado en placeOrder; captura no lo toca. Fixture sin
    // placeOrder → stock sin cambios.
    expect(pr.stockQuantity).toBe(5)
    const ev = await prisma.domainEvent.findFirst({ where: { type: 'payment.captured' } })
    expect(ev).not.toBeNull()
  })

  it('webhook replay idempotente (no doble-cargo de stock ni doble payment.captured)', async () => {
    const { order, product } = await makeOrder({ totalCents: 5000, stock: 5 })
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: 'evt_dup_1',
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 5000, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await handleStripeWebhook(body, signature)
    await handleStripeWebhook(body, signature) // replay
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    // ADR 0036: captura no toca stock (reservado en placeOrder); fixture sin placeOrder.
    expect(pr.stockQuantity).toBe(5)
    const captured = await prisma.domainEvent.findMany({ where: { type: 'payment.captured' } })
    expect(captured).toHaveLength(1)
  })

  it('webhook mismatch → NEEDS_REVIEW + auto-refund + PaymentMismatchError', async () => {
    const { order } = await makeOrder({ totalCents: 5000 })
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: `evt_mm_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 1, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await expect(handleStripeWebhook(body, signature)).rejects.toBeInstanceOf(PaymentMismatchError)
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('NEEDS_REVIEW')
  })

  it('reconcileWire idempotente (mismo wireReference no duplica)', async () => {
    const { order, product } = await makeOrder({ totalCents: 5000, stock: 3 })
    const u = await prisma.user.create({
      data: { email: `admin-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    await reconcileWire({
      orderId: order.id,
      amountCents: 5000,
      wireReference: 'WIRE-001',
      adminUserId: u.id,
    })
    await reconcileWire({
      orderId: order.id,
      amountCents: 5000,
      wireReference: 'WIRE-001',
      adminUserId: u.id,
    })
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    // ADR 0036: reconcileWire no toca stock (reservado en placeOrder); fixture sin placeOrder.
    expect(pr.stockQuantity).toBe(3)
    const reconciled = await prisma.domainEvent.findMany({
      where: { type: 'payment.reconciled' },
    })
    expect(reconciled).toHaveLength(1)
  })
})
