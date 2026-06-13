// AUDITORÍA 2026-06-12 — Reproducción del P0 PAY-1 (doble decremento de stock).
// Recorre el FLUJO REAL: cartService.addItem → ordersService.placeOrder →
// (wire) reconcileWire  /  (card) createCardCheckout + handleStripeWebhook.
// A diferencia de modules/payments/__tests__/service.test.ts, NO crea la orden
// directamente: la pasa por placeOrder, que YA decrementa stock. Si el segundo
// decremento existe, el stock baja DOS veces.
//
// Estas aserciones expresan el comportamiento CORRECTO (un único decremento).
// Si el bug existe, FALLAN — esa falla es la evidencia del P0.
import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { ordersService } from '@/modules/orders'
import { createCardCheckout, handleStripeWebhook, reconcileWire } from '@/modules/payments'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

const UNIT = '50.00'
const QTY = 3
const START_STOCK = 10
const AFTER_PLACE = START_STOCK - QTY // 7 — un único decremento esperado
const TOTAL_CENTS = 50_00 * QTY // 15000

async function seedRealFlow() {
  const user = await prisma.user.create({ data: { email: `repro-${Date.now()}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: 'Repro Org',
      slug: `repro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      name: 'Repro Product',
      basePrice: new Decimal(UNIT),
      stockQuantity: START_STOCK,
      categoryId: cat.id,
    },
  })
  // Flujo real: carrito → placeOrder (decrementa stock + deja PENDING_PAYMENT).
  await cartService.addItem({ userId: user.id, productId: product.id, quantity: QTY, orgId: org.id })
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

describe('PAY-1 reproducción — doble decremento de stock (flujo real placeOrder + captura)', () => {
  it('placeOrder decrementa stock exactamente una vez (sanity)', async () => {
    const { product } = await seedRealFlow()
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(pr.stockQuantity).toBe(AFTER_PLACE)
  })

  it('WIRE: placeOrder + reconcileWire → stock decrementado UNA sola vez', async () => {
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
    // Esperado: 7 (una reserva). Con el bug: 4 (placeOrder -3, reconcile -3).
    expect(pr.stockQuantity).toBe(AFTER_PLACE)
  })

  it('CARD: placeOrder + webhook checkout.session.completed → stock decrementado UNA sola vez', async () => {
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
    // Esperado: 7 (una reserva). Con el bug: 4 (placeOrder -3, captura -3).
    expect(pr.stockQuantity).toBe(AFTER_PLACE)
  })
})
