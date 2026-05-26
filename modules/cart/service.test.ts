import { prisma } from '@/lib/db/client'
import { catalogService } from '@/modules/catalog'
import { customersService } from '@/modules/customers'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { cartService } from './service'

async function seed() {
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.customerPrice.deleteMany()
  await prisma.orderLine.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationAddress.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({ data: { email: 'u@test.com' } })
  const org = await customersService.createOrganization({
    name: 'Org X',
    slug: 'org-x',
    ownerUserId: user.id,
  })
  const cat = await catalogService.createCategory({ slug: 'c1', name: 'C1' })
  const product = await catalogService.createProduct({
    sku: 'S1',
    slug: 'p-1',
    name: 'P1',
    basePrice: 10,
    stockQuantity: 100,
    categoryId: cat.id,
  })
  return { user, org, product }
}

describe('cartService.addItem', () => {
  beforeEach(async () => {
    await seed()
  })

  it('creates cart on first add and snapshots price', async () => {
    const { user, org, product } = await seed()
    const cart = await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      orgId: org.id,
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]?.unitPriceSnapshot.toString()).toBe('10')
    expect(cart.items[0]?.quantity).toBe(2)
  })

  it('snapshots customer price when override exists', async () => {
    const { user, org, product } = await seed()
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('7.50'),
      },
    })
    const cart = await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    expect(cart.items[0]?.unitPriceSnapshot.toString()).toBe('7.5')
  })

  it('upserts if item already in cart', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    const cart = await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 3,
      orgId: org.id,
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]?.quantity).toBe(3)
  })
})

describe('cartService.updateQuantity / removeItem / clear', () => {
  it('updates quantity', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      orgId: org.id,
    })
    const cart = await cartService.updateQuantity({
      userId: user.id,
      productId: product.id,
      quantity: 5,
    })
    expect(cart.items[0]?.quantity).toBe(5)
  })

  it('removes item when quantity = 0', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      orgId: org.id,
    })
    const cart = await cartService.updateQuantity({
      userId: user.id,
      productId: product.id,
      quantity: 0,
    })
    expect(cart.items).toHaveLength(0)
  })

  it('clears cart', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      orgId: org.id,
    })
    const cart = await cartService.clear(user.id)
    expect(cart.items).toHaveLength(0)
  })
})
