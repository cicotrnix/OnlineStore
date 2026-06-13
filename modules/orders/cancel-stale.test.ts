// OPS-1 (auditoría 2026-06-12, Decisión 1): liberar inventario reservado por
// órdenes wire impagas. El cron cancela PENDING_PAYMENT vencidas (paymentDueAt
// en el pasado), restaura stock atómicamente y emite order.cancelled.
import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { ordersService } from '@/modules/orders'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

async function placeRealOrder(stock = 10, qty = 3) {
  const user = await prisma.user.create({
    data: { email: `cs-${Date.now()}-${Math.random()}@t.com` },
  })
  const org = await prisma.organization.create({
    data: {
      name: 'CS Org',
      slug: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      name: 'CS Product',
      basePrice: new Decimal('50.00'),
      stockQuantity: stock,
      categoryId: cat.id,
    },
  })
  await cartService.addItem({
    userId: user.id,
    productId: product.id,
    quantity: qty,
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
})

describe('cancelStalePendingOrders', () => {
  it('cancela una orden PENDING_PAYMENT vencida, restaura stock y emite order.cancelled', async () => {
    const { product, order } = await placeRealOrder(10, 3)
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity
    ).toBe(7)
    // Vence el plazo de pago.
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentDueAt: new Date(Date.now() - 1000) },
    })

    const result = await ordersService.cancelStalePendingOrders()
    expect(result.cancelled).toBe(1)

    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(o.status).toBe('CANCELLED')
    const pr = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(pr.stockQuantity).toBe(10) // stock restaurado
    const ev = await prisma.domainEvent.findFirst({
      where: { type: 'order.cancelled', aggregateId: order.id },
    })
    expect(ev).not.toBeNull()
  })

  it('NO cancela una orden cuyo paymentDueAt está en el futuro (override admin)', async () => {
    const { product, order } = await placeRealOrder(10, 2)
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentDueAt: new Date(Date.now() + 7 * 86_400_000) },
    })

    const result = await ordersService.cancelStalePendingOrders()
    expect(result.cancelled).toBe(0)

    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(o.status).toBe('PENDING_PAYMENT')
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity
    ).toBe(8)
  })

  it('NO cancela órdenes ya CONFIRMED aunque tengan paymentDueAt vencido', async () => {
    const { order } = await placeRealOrder(10, 1)
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        paymentDueAt: new Date(Date.now() - 1000),
      },
    })
    const result = await ordersService.cancelStalePendingOrders()
    expect(result.cancelled).toBe(0)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'CONFIRMED'
    )
  })
})
