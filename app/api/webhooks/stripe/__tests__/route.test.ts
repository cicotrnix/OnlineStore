import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { createCardCheckout } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from '../route'

async function makeOrder() {
  const user = await prisma.user.create({ data: { email: `wr-${Date.now()}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: 'O', slug: `o-${Date.now()}`, verificationStatus: 'VERIFIED' },
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
      basePrice: new Decimal('50.00'),
      stockQuantity: 5,
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
      subtotal: new Decimal('50.00'),
      total: new Decimal('50.00'),
      currency: 'USD',
      lines: {
        create: [
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: new Decimal('50.00'),
            quantity: 1,
            lineTotal: new Decimal('50.00'),
          },
        ],
      },
    },
  })
  return { order, product }
}

function makeRequest(body: string, signature: string): Request {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
    body,
  })
}

beforeEach(async () => {
  await cleanDb()
  _resetStripe()
})

describe('POST /api/webhooks/stripe', () => {
  it('firma válida + happy path → 200 + Payment CAPTURED + payment.captured event', async () => {
    const { order, product } = await makeOrder()
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 5000, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)

    const res = await POST(makeRequest(body, signature))
    expect(res.status).toBe(200)

    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('CAPTURED')
    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(o.status).toBe('CONFIRMED')
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(pr.stockQuantity).toBe(4)
    const ev = await prisma.domainEvent.findFirst({ where: { type: 'payment.captured' } })
    expect(ev).not.toBeNull()
  })

  it('firma inválida → 400, no toca DB', async () => {
    const { order } = await makeOrder()
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const res = await POST(makeRequest('{}', 'sig-bad'))
    expect(res.status).toBe(400)
    const captured = await prisma.domainEvent.findMany({ where: { type: 'payment.captured' } })
    expect(captured).toHaveLength(0)
  })

  it('mismatch → 200 (no reintenta) + NEEDS_REVIEW', async () => {
    const { order } = await makeOrder()
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: `evt_mm_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: 1, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    const res = await POST(makeRequest(body, signature))
    expect(res.status).toBe(200)
    const p = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(p.status).toBe('NEEDS_REVIEW')
  })
})
