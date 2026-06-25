/**
 * Paridad post-pago del path de TARJETA (handleStripeWebhook) — integración con
 * el outbox real. Cubre los efectos que el e2e (CONFIRMED + stock) no veía y por
 * los que se escaparon los gaps: factura PAID + payment.captured emitido + la
 * notificación PAYMENT_CAPTURED encolada para el comprador + el asiento en el
 * ledger. Corre dispatchPending (como el worker process-domain-events).
 */
import { prisma } from '@/lib/db/client'
import { _getFakeStripe, _resetStripe } from '@/lib/stripe'
import { accountingSubscriber, seedChartOfAccounts } from '@/modules/accounting'
import { _resetSubscribers, dispatchPending, registerSubscriber } from '@/modules/events'
import { emailSubscriber } from '@/modules/notifications'
import { createCardCheckout, handleStripeWebhook } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

beforeAll(async () => {
  await cleanDb()
  await seedChartOfAccounts() // el chart sobrevive (cleanDb solo en beforeAll)
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.accountingPeriod.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.eventDelivery.deleteMany()
  await prisma.domainEvent.deleteMany()
  _resetStripe()
  _resetSubscribers()
  registerSubscriber(emailSubscriber)
  registerSubscriber(accountingSubscriber)
})

async function makeOrder(totalCents = 5000) {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `b-${s}@t.com`, name: 'Buyer' } })
  const org = await prisma.organization.create({
    data: { name: 'O', slug: `o-${s}`, verificationStatus: 'VERIFIED' },
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
      basePrice: new Decimal((totalCents / 100).toFixed(2)),
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
      subtotal: new Decimal((totalCents / 100).toFixed(2)),
      total: new Decimal((totalCents / 100).toFixed(2)),
      currency: 'USD',
      lines: {
        create: [
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: new Decimal((totalCents / 100).toFixed(2)),
            quantity: 1,
            lineTotal: new Decimal((totalCents / 100).toFixed(2)),
          },
        ],
      },
    },
  })
  return { user, order }
}

describe('paridad post-pago — captura con tarjeta', () => {
  it('factura PAID + payment.captured + notif PAYMENT_CAPTURED encolada + asiento en ledger', async () => {
    const { user, order } = await makeOrder()
    await createCardCheckout({ orderId: order.id, successUrl: 'http://s', cancelUrl: 'http://c' })
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })
    const event = {
      id: `evt_int_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: payment.stripeSessionId,
          amount_total: 5000,
          currency: 'usd',
          payment_intent: 'pi_int',
        },
      },
    }
    const { body, signature } = _getFakeStripe()._signPayload(event)
    await handleStripeWebhook(body, signature)

    // (sync) la captura liquida la factura — paridad con wire (Tarea 1).
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(invoice.status).toBe('PAID')
    expect(invoice.paidAt).not.toBeNull()

    // (sync) payment.captured emitido al outbox.
    const captured = await prisma.domainEvent.findFirstOrThrow({
      where: { type: 'payment.captured', aggregateId: payment.id },
    })

    // procesar el outbox como el worker real.
    await dispatchPending({ batchSize: 50 })

    // (async) notificación PAYMENT_CAPTURED encolada para el comprador.
    const notif = await prisma.notification.findFirst({
      where: { type: 'PAYMENT_CAPTURED', userId: user.id, subjectId: payment.id },
    })
    expect(notif).not.toBeNull()

    // (async) asiento contable balanceado por el payment.captured (eventId UNIQUE).
    const ledger = await prisma.journalEntry.findUnique({
      where: { eventId: captured.id },
      include: { lines: true },
    })
    expect(ledger).not.toBeNull()
    const debits = ledger!.lines.reduce((sum, l) => sum + l.debitCents, 0n)
    const credits = ledger!.lines.reduce((sum, l) => sum + l.creditCents, 0n)
    expect(debits).toBe(credits)
    expect(debits).toBe(5000n)
  })
})
