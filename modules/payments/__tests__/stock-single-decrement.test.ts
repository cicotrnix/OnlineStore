// Regresión del P0 PAY-1 (auditoría 2026-06-12, Decisión 1).
// El stock se RESERVA en placeOrder (punto único). El webhook de captura y
// reconcileWire solo validan + confirman: NO vuelven a tocar stock.
// Recorre el flujo real (cartService.addItem → placeOrder → pago) en vez de
// crear la orden con prisma.order.create, que es lo que ocultaba el bug.
import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { cartService } from '@/modules/cart'
import { ordersService } from '@/modules/orders'
import { createCardCheckout, handleStripeWebhook, reconcileWire } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

const UNIT = '50.00'
const QTY = 3
const START_STOCK = 10
const AFTER_PLACE = START_STOCK - QTY // 7 — un único decremento
const TOTAL_CENTS = 5000 * QTY // 15000

async function seedRealFlow() {
  const user = await prisma.user.create({
    data: { email: `sd-${Date.now()}-${Math.random()}@t.com` },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'SD Org',
      slug: `sd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      name: 'SD Product',
      basePrice: new Decimal(UNIT),
      stockQuantity: START_STOCK,
      categoryId: cat.id,
    },
  })
  await cartService.addItem({
    userId: user.id,
    productId: product.id,
    quantity: QTY,
    orgId: org.id,
  })
  const order = await ordersService.placeOrder({
    userId: user.id,
    orgId: org.id,
    billingAddressId: addr.id,
    shippingAddressId: addr.id,
  })
  return { user, org, product, order }
}

beforeEach(async () => {
  await cleanDb()
  _resetStripe()
})

describe('stock se reserva en placeOrder (punto único de decremento)', () => {
  it('placeOrder decrementa una vez y fija paymentDueAt (~placedAt + 3 días)', async () => {
    const { product, order } = await seedRealFlow()
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(pr.stockQuantity).toBe(AFTER_PLACE)
    const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(full.paymentDueAt).not.toBeNull()
    const days = (full.paymentDueAt!.getTime() - full.placedAt.getTime()) / 86_400_000
    expect(days).toBeGreaterThan(2.9)
    expect(days).toBeLessThan(3.1)
  })

  it('WIRE: placeOrder + reconcileWire → stock baja UNA sola vez', async () => {
    const { product, order } = await seedRealFlow()
    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    await reconcileWire({
      orderId: order.id,
      amountCents: TOTAL_CENTS,
      wireReference: `WIRE-${Date.now()}`,
      adminUserId: admin.id,
    })
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(pr.stockQuantity).toBe(AFTER_PLACE)
    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(o.status).toBe('CONFIRMED')
  })

  it('CARD: placeOrder + webhook checkout.session.completed → stock baja UNA sola vez', async () => {
    const { product, order } = await seedRealFlow()
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: { id: payment.stripeSessionId, amount_total: TOTAL_CENTS, currency: 'usd' } },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await handleStripeWebhook(body, signature)
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(pr.stockQuantity).toBe(AFTER_PLACE)
    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(o.status).toBe('CONFIRMED')
  })
})
