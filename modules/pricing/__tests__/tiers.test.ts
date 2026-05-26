import { prisma } from '@/lib/db/client'
import type storeConfig from '@/store.config'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pricingService } from '../service'
import { deleteTier, listTiersForProduct, upsertTier } from '../tiers'

beforeEach(cleanDb)

vi.mock('@/store.config', async () => {
  const actual = (await vi.importActual('@/store.config')) as { default: typeof storeConfig }
  return {
    default: {
      ...actual.default,
      modules: { ...actual.default.modules, volumeDiscounts: true },
    },
  }
})

async function makeProduct(slug: string, basePrice: number) {
  const cat = await prisma.category.create({ data: { name: 'C', slug: `tier-cat-${slug}` } })
  return prisma.product.create({
    data: {
      name: 'P',
      slug: `tier-prod-${slug}`,
      sku: `TIER-${slug}`,
      basePrice: new Decimal(basePrice),
      stockQuantity: 1000,
      isActive: true,
      categoryId: cat.id,
    },
  })
}

describe('pricing.tiers CRUD', () => {
  it('upserts a tier', async () => {
    const p = await makeProduct('crud-1', 100)
    const tier = await upsertTier({ productId: p.id, minQty: 50, unitPrice: 90 })
    expect(tier.minQty).toBe(50)
    expect(tier.unitPrice.toString()).toBe('90')
  })

  it('rejects minQty <= 0', async () => {
    const p = await makeProduct('crud-2', 100)
    await expect(upsertTier({ productId: p.id, minQty: 0, unitPrice: 90 })).rejects.toThrow(
      /minQty/
    )
  })

  it('rejects unitPrice <= 0', async () => {
    const p = await makeProduct('crud-3', 100)
    await expect(upsertTier({ productId: p.id, minQty: 10, unitPrice: 0 })).rejects.toThrow(
      /unitPrice/
    )
  })

  it('list returns sorted by minQty asc', async () => {
    const p = await makeProduct('crud-4', 100)
    await upsertTier({ productId: p.id, minQty: 100, unitPrice: 80 })
    await upsertTier({ productId: p.id, minQty: 10, unitPrice: 95 })
    await upsertTier({ productId: p.id, minQty: 50, unitPrice: 90 })
    const tiers = await listTiersForProduct(p.id)
    expect(tiers.map((t) => t.minQty)).toEqual([10, 50, 100])
  })

  it('deletes tier', async () => {
    const p = await makeProduct('crud-5', 100)
    const tier = await upsertTier({ productId: p.id, minQty: 25, unitPrice: 88 })
    await deleteTier(tier.id)
    const tiers = await listTiersForProduct(p.id)
    expect(tiers.length).toBe(0)
  })
})

describe('pricing.resolvePriceWithTiers', () => {
  it('returns base price with 0 discount when no tier matches qty', async () => {
    const p = await makeProduct('res-1', 100)
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'tier-org-1' } })
    await upsertTier({ productId: p.id, minQty: 100, unitPrice: 80 })
    const r = await pricingService.resolvePriceWithTiers(org.id, p.id, 10)
    expect(r.unitPrice.toString()).toBe('100')
    expect(r.discountAmount.toString()).toBe('0')
  })

  it('returns tier discount when qty matches', async () => {
    const p = await makeProduct('res-2', 100)
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'tier-org-2' } })
    await upsertTier({ productId: p.id, minQty: 100, unitPrice: 80 })
    const r = await pricingService.resolvePriceWithTiers(org.id, p.id, 120)
    expect(r.unitPrice.toString()).toBe('100')
    expect(r.discountAmount.toString()).toBe('2400')
  })

  it('uses CustomerPrice as base when present', async () => {
    const p = await makeProduct('res-3', 100)
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'tier-org-3' } })
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: p.id,
        price: new Decimal('90'),
      },
    })
    await upsertTier({ productId: p.id, minQty: 100, unitPrice: 80 })
    const r = await pricingService.resolvePriceWithTiers(org.id, p.id, 120)
    expect(r.unitPrice.toString()).toBe('90')
    expect(r.discountAmount.toString()).toBe('1200')
  })

  it('discount = 0 when customer price already cheaper than tier', async () => {
    const p = await makeProduct('res-4', 100)
    const org = await prisma.organization.create({ data: { name: 'O', slug: 'tier-org-4' } })
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: p.id,
        price: new Decimal('70'),
      },
    })
    await upsertTier({ productId: p.id, minQty: 100, unitPrice: 80 })
    const r = await pricingService.resolvePriceWithTiers(org.id, p.id, 120)
    expect(r.unitPrice.toString()).toBe('70')
    expect(r.discountAmount.toString()).toBe('0')
  })
})
