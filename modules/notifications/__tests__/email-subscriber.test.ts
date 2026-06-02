import { prisma } from '@/lib/db/client'
import { _resetSubscribers, dispatchPending, emitEvent, registerSubscriber } from '@/modules/events'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { emailSubscriber } from '../email-subscriber'

async function makeOrder() {
  const user = await prisma.user.create({ data: { email: `e-${Date.now()}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: 'O', slug: `o-${Date.now()}`, verificationStatus: 'VERIFIED' },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'BUYER' },
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
  const order = await prisma.order.create({
    data: {
      orderNumber: `O-${Date.now()}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'CONFIRMED',
      paymentMethod: 'PREPAID',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      subtotal: new Decimal('50.00'),
      total: new Decimal('50.00'),
      currency: 'USD',
    },
  })
  return { user, org, order }
}

beforeEach(async () => {
  await cleanDb()
  _resetSubscribers()
  registerSubscriber(emailSubscriber)
})

describe('emailSubscriber — outbox-driven', () => {
  it('order.placed → Notification ORDER_PLACED para el comprador', async () => {
    const { user, order } = await makeOrder()
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: order.id,
        payload: { orderNumber: order.orderNumber },
      })
    })
    await dispatchPending({ batchSize: 10 })
    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: 'ORDER_PLACED' },
    })
    expect(notif).not.toBeNull()
    expect(notif?.title).toMatch(/Orden/)
  })

  it('shipment.dispatched → SHIPMENT_DISPATCHED con tracking en el body', async () => {
    const { user, order } = await makeOrder()
    const sh = await prisma.shipment.create({
      data: { orderId: order.id, carrier: 'FEDEX', service: 'FEDEX_GROUND', status: 'DISPATCHED' },
    })
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'shipment.dispatched',
        aggregateType: 'Shipment',
        aggregateId: sh.id,
        payload: { orderId: order.id, trackingNumber: 'FX12345', carrier: 'FEDEX' },
      })
    })
    await dispatchPending({ batchSize: 10 })
    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: 'SHIPMENT_DISPATCHED' },
    })
    expect(notif).not.toBeNull()
    expect(notif?.body).toContain('FX12345')
  })

  it('replay del evento via dispatcher: dedup por (subscriber, eventId)', async () => {
    const { user, order } = await makeOrder()
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: order.id,
        payload: {},
      })
    })
    await dispatchPending({ batchSize: 10 })
    await prisma.$executeRawUnsafe(
      `UPDATE "DomainEvent" SET status = 'PENDING'::"DomainEventStatus"`
    )
    // Mantengo EventDelivery DONE → dispatcher salta (no re-envía).
    await dispatchPending({ batchSize: 10 })
    const notifs = await prisma.notification.findMany({
      where: { userId: user.id, type: 'ORDER_PLACED' },
    })
    expect(notifs).toHaveLength(1)
  })
})
