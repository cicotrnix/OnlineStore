// PAY-3 (auditoría 2026-06-12): la idempotencia de reconcileWire era por
// wireReference GLOBAL (eventId = 'wire-' + ref). Una ref vacía o repetida
// entre órdenes distintas colisionaba → el 2º reconcileWire hacía no-op
// silencioso y la orden quedaba sin confirmar (mientras el admin vería "pagado").
// Fix: eventId por orden + validar ref no vacía + throw si el dup es de otra orden.
import { prisma } from '@/lib/db/client'
import { reconcileWire } from '@/modules/payments'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

async function makeOrder(totalCents = 5000) {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `rw-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: { name: 'RW', slug: `rw-${s}`, verificationStatus: 'VERIFIED' },
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
  return prisma.order.create({
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
}

beforeEach(async () => {
  await cleanDb()
})

describe('reconcileWire idempotencia por orden (PAY-3)', () => {
  it('dos órdenes distintas con la MISMA wireReference: ambas se confirman (sin colisión)', async () => {
    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    const orderA = await makeOrder(5000)
    const orderB = await makeOrder(5000)
    const REF = 'BANK-REF-REUSED'

    await reconcileWire({
      orderId: orderA.id,
      amountCents: 5000,
      wireReference: REF,
      adminUserId: admin.id,
    })
    await reconcileWire({
      orderId: orderB.id,
      amountCents: 5000,
      wireReference: REF,
      adminUserId: admin.id,
    })

    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA.id } })).status).toBe(
      'CONFIRMED'
    )
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderB.id } })).status).toBe(
      'CONFIRMED'
    )
    // Un evento payment.reconciled por orden.
    const events = await prisma.domainEvent.findMany({ where: { type: 'payment.reconciled' } })
    expect(events).toHaveLength(2)
  })

  it('wireReference vacía → throw (no no-op silencioso)', async () => {
    const admin = await prisma.user.create({
      data: { email: `admin2-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    const order = await makeOrder(5000)
    await expect(
      reconcileWire({
        orderId: order.id,
        amountCents: 5000,
        wireReference: '   ',
        adminUserId: admin.id,
      })
    ).rejects.toThrow()
    // La orden NO quedó confirmada (falló ruidosamente).
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'PENDING_PAYMENT'
    )
  })

  it('misma orden + misma ref dos veces: idempotente (1 evento, confirmada una vez)', async () => {
    const admin = await prisma.user.create({
      data: { email: `admin3-${Date.now()}@t.com`, isPlatformAdmin: true },
    })
    const order = await makeOrder(5000)
    const REF = 'WIRE-IDEM'
    await reconcileWire({
      orderId: order.id,
      amountCents: 5000,
      wireReference: REF,
      adminUserId: admin.id,
    })
    await reconcileWire({
      orderId: order.id,
      amountCents: 5000,
      wireReference: REF,
      adminUserId: admin.id,
    })

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'CONFIRMED'
    )
    const events = await prisma.domainEvent.findMany({
      where: { type: 'payment.reconciled', aggregateType: 'Payment' },
    })
    expect(events).toHaveLength(1)
  })
})
