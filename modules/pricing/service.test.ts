import { prisma } from '@/lib/db/client'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { pricingService } from './service'

async function seed() {
  await prisma.customerPrice.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.quoteAuditLog.deleteMany()
  await prisma.quoteLine.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.approvalRequest.deleteMany()
  await prisma.order.deleteMany()
  await prisma.orderLine.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.organization.deleteMany()

  const category = await prisma.category.create({
    data: { slug: 'cat-test', name: 'Test', sortOrder: 0 },
  })
  const product = await prisma.product.create({
    data: {
      sku: 'SKU-1',
      slug: 'p-1',
      name: 'Producto 1',
      basePrice: new Decimal('10.00'),
      categoryId: category.id,
    },
  })
  const org = await prisma.organization.create({
    data: { name: 'Org A', slug: 'org-a' },
  })
  return { product, org, category }
}

describe('pricingService.resolveForOrg', () => {
  beforeEach(async () => await seed())

  it('returns customer override when active', async () => {
    const { product, org } = await seed()
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('8.00'),
      },
    })
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('8')
  })

  it('returns base price when no override exists', async () => {
    const { product, org } = await seed()
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('10')
  })

  it('returns base price when override validFrom is in future', async () => {
    const { product, org } = await seed()
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('5.00'),
        validFrom: future,
      },
    })
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('10')
  })

  it('returns base price when override validUntil is in past', async () => {
    const { product, org } = await seed()
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('5.00'),
        validUntil: past,
      },
    })
    const price = await pricingService.resolveForOrg(org.id, product.id)
    expect(price.toString()).toBe('10')
  })

  it('throws when product does not exist', async () => {
    const { org } = await seed()
    await expect(
      pricingService.resolveForOrg(org.id, 'cltestxxx00000000000nonexist')
    ).rejects.toThrow(/product not found/i)
  })
})

describe('pricingService.batchResolveForOrg', () => {
  it('returns map of productId → price for multiple products', async () => {
    const { org, category } = await seed()
    const p1 = await prisma.product.findFirstOrThrow()
    const p2 = await prisma.product.create({
      data: {
        sku: 'SKU-2',
        slug: 'p-2',
        name: 'Producto 2',
        basePrice: new Decimal('20.00'),
        categoryId: category.id,
      },
    })
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: p1.id,
        price: new Decimal('7.00'),
      },
    })

    const result = await pricingService.batchResolveForOrg(org.id, [p1.id, p2.id])
    expect(result.get(p1.id)?.toString()).toBe('7')
    expect(result.get(p2.id)?.toString()).toBe('20')
  })
})
