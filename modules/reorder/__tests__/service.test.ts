// Loop de re-orden (spec 2026-06-13). reorderToCart agrega las líneas viables
// de un pedido pasado al carrito actual (precio de hoy vía addItem) y omite con
// motivo lo no viable. Authz por org.
import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { OrderNotFoundError, reorderService } from '@/modules/reorder'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

type LineSpec = { active?: boolean; stock?: number; qty?: number; private?: boolean }

async function seedOrder(lines: LineSpec[], opts: { verified?: boolean } = {}) {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({ data: { email: `ro-${s}@t.com` } })
  const org = await prisma.organization.create({
    data: {
      name: 'RO',
      slug: `ro-${s}`,
      verificationStatus: opts.verified === false ? 'PENDING' : 'VERIFIED',
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
  const cat = await prisma.category.create({ data: { slug: `c-${s}`, name: 'C' } })
  const products = await Promise.all(
    lines.map((l, i) =>
      prisma.product.create({
        data: {
          sku: `S-${s}-${i}`,
          slug: `s-${s}-${i}`,
          name: `Prod ${i}`,
          basePrice: new Decimal('10.00'),
          stockQuantity: l.stock ?? 10,
          isActive: l.active ?? true,
          isPrivate: l.private ?? false,
          categoryId: cat.id,
        },
      })
    )
  )
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${s}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'CONFIRMED',
      paymentMethod: 'PREPAID',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      subtotal: new Decimal('10.00'),
      total: new Decimal('10.00'),
      currency: 'USD',
      lines: {
        create: products.map((p, i) => ({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          unitPrice: new Decimal('10.00'),
          quantity: lines[i]?.qty ?? 2,
          lineTotal: new Decimal('20.00'),
        })),
      },
    },
  })
  return { user, org, order, products }
}

beforeEach(async () => {
  await cleanDb()
})

describe('reorderService.reorderToCart', () => {
  it('todo disponible → added = todas las líneas, skipped vacío', async () => {
    const { user, org, order, products } = await seedOrder([{ qty: 2 }, { qty: 3 }])
    const r = await reorderService.reorderToCart({
      orderId: order.id,
      userId: user.id,
      orgId: org.id,
    })
    expect(r.skipped).toHaveLength(0)
    expect(r.added.map((a) => a.productId).sort()).toEqual(products.map((p) => p.id).sort())
    expect(r.added.find((a) => a.productId === products[1]!.id)?.addedQty).toBe(3)
    // realmente en el carrito
    const cart = await cartService.get(user.id)
    expect(cart.items).toHaveLength(2)
  })

  it('línea inactiva → skipped inactive', async () => {
    const { user, org, order, products } = await seedOrder([{ active: false }, { qty: 1 }])
    const r = await reorderService.reorderToCart({
      orderId: order.id,
      userId: user.id,
      orgId: org.id,
    })
    expect(r.skipped).toEqual([
      expect.objectContaining({ productId: products[0]!.id, reason: 'inactive' }),
    ])
    expect(r.added).toHaveLength(1)
  })

  it('stock parcial → addedQty = stock', async () => {
    const { user, org, order, products } = await seedOrder([{ qty: 5, stock: 2 }])
    const r = await reorderService.reorderToCart({
      orderId: order.id,
      userId: user.id,
      orgId: org.id,
    })
    expect(r.added).toEqual([
      expect.objectContaining({ productId: products[0]!.id, requestedQty: 5, addedQty: 2 }),
    ])
  })

  it('sin acceso (producto privado sin grant) → skipped no_access', async () => {
    const { user, org, order, products } = await seedOrder([{ private: true }, { qty: 1 }])
    const r = await reorderService.reorderToCart({
      orderId: order.id,
      userId: user.id,
      orgId: org.id,
    })
    expect(r.skipped).toEqual([
      expect.objectContaining({ productId: products[0]!.id, reason: 'no_access' }),
    ])
    expect(r.added).toHaveLength(1)
  })

  it('todo no disponible → added vacío', async () => {
    const { user, org, order } = await seedOrder([{ active: false }, { stock: 0 }])
    const r = await reorderService.reorderToCart({
      orderId: order.id,
      userId: user.id,
      orgId: org.id,
    })
    expect(r.added).toHaveLength(0)
    expect(r.skipped).toHaveLength(2)
  })

  it('authz: pedido de otra org → OrderNotFoundError', async () => {
    const { order } = await seedOrder([{ qty: 1 }])
    const otherUser = await prisma.user.create({ data: { email: `other-${Date.now()}@t.com` } })
    const otherOrg = await prisma.organization.create({
      data: { name: 'Other', slug: `other-${Date.now()}`, verificationStatus: 'VERIFIED' },
    })
    await expect(
      reorderService.reorderToCart({ orderId: order.id, userId: otherUser.id, orgId: otherOrg.id })
    ).rejects.toBeInstanceOf(OrderNotFoundError)
  })
})
