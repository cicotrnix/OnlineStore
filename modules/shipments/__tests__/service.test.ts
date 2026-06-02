import { prisma } from '@/lib/db/client'
import { _resetFedex } from '@/lib/fedex'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { HAZMAT_LIMITS, dispatchShipment, quoteShipment } from '../service'

async function makeOrder(opts: { country?: string } = {}) {
  const user = await prisma.user.create({ data: { email: `s-${Date.now()}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: 'O', slug: `o-${Date.now()}`, verificationStatus: 'VERIFIED' },
  })
  const addr = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'M',
      recipient: 'R',
      line1: '1 Main',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: opts.country ?? 'US',
    },
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: `O-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
  return { order, addr }
}

beforeEach(async () => {
  await cleanDb()
  _resetFedex()
})

describe('quoteShipment — USA Ground only', () => {
  it('cotiza Ground para destino US', async () => {
    const { order } = await makeOrder({ country: 'US' })
    const r = await quoteShipment({
      orderId: order.id,
      fromZip: '33101',
      weightLbs: 10,
    })
    expect(r.isExport).toBe(false)
    expect(r.rateCents).toBeGreaterThan(0n)
    const sh = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(sh.service).toBe('FEDEX_GROUND')
    expect(sh.status).toBe('RATE_QUOTED')
  })

  it('destino no-US: marca isExport, no cotiza FedEx', async () => {
    const { order } = await makeOrder({ country: 'MX' })
    const r = await quoteShipment({
      orderId: order.id,
      fromZip: '33101',
      weightLbs: 10,
    })
    expect(r.isExport).toBe(true)
    expect(r.rateCents).toBeNull()
    const sh = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(sh.notes).toMatch(/forwarder/i)
  })

  it('hazmat sobre límite de celdas → throw', async () => {
    const { order } = await makeOrder({ country: 'US' })
    await expect(
      quoteShipment({
        orderId: order.id,
        fromZip: '33101',
        weightLbs: 10,
        hazmat: true,
        hazmatCells: HAZMAT_LIMITS.maxCells + 1,
      })
    ).rejects.toThrow(/HAZMAT_LIMIT_CELLS/)
  })

  it('hazmat sobre límite de watt-hours → throw', async () => {
    const { order } = await makeOrder({ country: 'US' })
    await expect(
      quoteShipment({
        orderId: order.id,
        fromZip: '33101',
        weightLbs: 10,
        hazmat: true,
        hazmatWattHours: HAZMAT_LIMITS.maxWattHours + 1,
      })
    ).rejects.toThrow(/HAZMAT_LIMIT_WH/)
  })
})

describe('dispatchShipment', () => {
  const fromAddress = {
    recipient: 'PiPower',
    line1: '100 Warehouse',
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
  }

  it('US: compra etiqueta + dispatched + emite shipment.dispatched', async () => {
    const { order } = await makeOrder({ country: 'US' })
    await quoteShipment({ orderId: order.id, fromZip: '33101', weightLbs: 10 })
    const sh = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } })
    const r = await dispatchShipment({
      shipmentId: sh.id,
      fromAddress,
      weightLbs: 10,
    })
    expect(r.trackingNumber).toMatch(/^FX/)
    const after = await prisma.shipment.findUniqueOrThrow({ where: { id: sh.id } })
    expect(after.status).toBe('DISPATCHED')
    expect(after.trackingNumber).toBe(r.trackingNumber)
    const ev = await prisma.domainEvent.findFirst({ where: { type: 'shipment.dispatched' } })
    expect(ev).not.toBeNull()
  })

  it('idempotente: segundo dispatch devuelve mismo tracking, no doble evento', async () => {
    const { order } = await makeOrder({ country: 'US' })
    await quoteShipment({ orderId: order.id, fromZip: '33101', weightLbs: 10 })
    const sh = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } })
    const a = await dispatchShipment({ shipmentId: sh.id, fromAddress, weightLbs: 10 })
    const b = await dispatchShipment({ shipmentId: sh.id, fromAddress, weightLbs: 10 })
    expect(a.trackingNumber).toBe(b.trackingNumber)
    const events = await prisma.domainEvent.findMany({ where: { type: 'shipment.dispatched' } })
    expect(events).toHaveLength(1)
  })

  it('export: rechaza dispatch (lo hace el forwarder Miami)', async () => {
    const { order } = await makeOrder({ country: 'MX' })
    await quoteShipment({ orderId: order.id, fromZip: '33101', weightLbs: 10 })
    const sh = await prisma.shipment.findUniqueOrThrow({ where: { orderId: order.id } })
    await expect(
      dispatchShipment({ shipmentId: sh.id, fromAddress, weightLbs: 10 })
    ).rejects.toThrow(/EXPORT_SHIPMENT/)
  })
})
