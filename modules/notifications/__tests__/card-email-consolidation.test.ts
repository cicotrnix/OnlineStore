/**
 * Consolidación path-aware: una orden pagada con TARJETA encola exactamente 1
 * email (PAYMENT_CAPTURED consolidado), suprimiendo ORDER_PLACED /
 * INVOICE_DUE_SOON / INVOICE_ISSUED / INVOICE_PAID. Wire (sin Payment de
 * tarjeta) mantiene los escalonados.
 */
import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { createInvoiceFromOrder } from '@/modules/accounts'
import { _resetSubscribers, dispatchPending, emitEvent, registerSubscriber } from '@/modules/events'
import { emailSubscriber } from '@/modules/notifications'
import { createCardCheckout, handleStripeWebhook } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await cleanDb()
})

beforeEach(async () => {
  await prisma.notification.deleteMany()
  await prisma.eventDelivery.deleteMany()
  await prisma.domainEvent.deleteMany()
  _resetStripe()
  _resetSubscribers()
  registerSubscriber(emailSubscriber) // solo email (accounting fuera → sin chart)
})

async function makeOrder(
  opts: { paymentTerms?: 'PREPAID' | 'NET_30'; withCardPayment?: boolean } = {}
): Promise<{ userId: string; orderId: string; orderNumber: string }> {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `b-${s}@t.com`, name: 'Buyer' } })
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug: `o-${s}`,
      verificationStatus: 'VERIFIED',
      paymentTerms: opts.paymentTerms ?? 'PREPAID',
    },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
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
  const cat = await prisma.category.create({ data: { slug: `c-${s}`, name: 'C' } })
  const product = await prisma.product.create({
    data: {
      sku: `S-${s}`,
      slug: `s-${s}`,
      name: 'P',
      basePrice: new Decimal('50.00'),
      stockQuantity: 10,
      categoryId: cat.id,
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${s}`,
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
  if (opts.withCardPayment) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE_CARD',
        status: 'PENDING',
        amountCents: 5000n,
        currency: 'USD',
        stripeSessionId: `cs_${s}`,
        idempotencyKey: `idem-${s}`,
      },
    })
  }
  return { userId: user.id, orderId: order.id, orderNumber: order.orderNumber }
}

// Emite los eventos del placement (lo que hace placeOrder) al outbox.
async function emitPlacement(orderId: string, invoiceId: string, orderNumber: string) {
  await prisma.$transaction(async (tx) => {
    await emitEvent(tx, {
      type: 'order.placed',
      aggregateType: 'Order',
      aggregateId: orderId,
      payload: { orderNumber, orderId },
    })
    await emitEvent(tx, {
      type: 'invoice.issued',
      aggregateType: 'Invoice',
      aggregateId: invoiceId,
      payload: { invoiceId, orderId, amountCents: 5000 },
    })
  })
}

describe('consolidación de email para pago con tarjeta', () => {
  it('orden con tarjeta → exactamente 1 email (PAYMENT_CAPTURED consolidado)', async () => {
    const { userId, orderId, orderNumber } = await makeOrder()

    // Placement: crea la factura (INVOICE_DUE_SOON suprimido por PREPAID) + eventos.
    const invoice = await createInvoiceFromOrder(orderId)
    await emitPlacement(orderId, invoice.id, orderNumber)

    // Checkout con tarjeta → Payment STRIPE_CARD.
    await createCardCheckout({ orderId, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } })

    // Captura: settle(notify:false, sin INVOICE_PAID) + payment.captured.
    const event = {
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: payment.stripeSessionId,
          amount_total: 5000,
          currency: 'usd',
          payment_intent: 'pi_x',
        },
      },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await handleStripeWebhook(body, signature)

    // Procesa el outbox (order.placed → null, invoice.issued → null, captured → 1).
    await dispatchPending({ batchSize: 50 })

    const notifs = await prisma.notification.findMany({ where: { userId } })
    expect(notifs).toHaveLength(1)
    expect(notifs[0]?.type).toBe('PAYMENT_CAPTURED')
    expect(notifs[0]?.title).toContain('¡Gracias por tu compra!')
    expect(notifs[0]?.title).toContain(orderNumber)
  })

  it('wire (sin Payment de tarjeta) → order.placed e invoice.issued NO se suprimen', async () => {
    const { userId, orderId, orderNumber } = await makeOrder()
    const invoice = await createInvoiceFromOrder(orderId)
    await emitPlacement(orderId, invoice.id, orderNumber)
    // sin createCardCheckout → no hay Payment STRIPE_CARD.
    await dispatchPending({ batchSize: 50 })

    const types = (await prisma.notification.findMany({ where: { userId } })).map((n) => n.type)
    expect(types).toContain('ORDER_PLACED')
    expect(types).toContain('INVOICE_ISSUED')
  })

  it('orden NET pagada con tarjeta → INVOICE_DUE_SOON suprimido (cardPaid, no solo days)', async () => {
    const { userId, orderId } = await makeOrder({ paymentTerms: 'NET_30', withCardPayment: true })
    await createInvoiceFromOrder(orderId) // dispatch directo de INVOICE_DUE_SOON
    const dueSoon = await prisma.notification.count({ where: { type: 'INVOICE_DUE_SOON', userId } })
    expect(dueSoon).toBe(0)
  })

  it('orden NET por wire (sin tarjeta) → INVOICE_DUE_SOON SÍ se manda', async () => {
    const { userId, orderId } = await makeOrder({ paymentTerms: 'NET_30' })
    await createInvoiceFromOrder(orderId)
    const dueSoon = await prisma.notification.count({ where: { type: 'INVOICE_DUE_SOON', userId } })
    expect(dueSoon).toBe(1)
  })
})
