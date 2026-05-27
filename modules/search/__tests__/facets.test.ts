import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { computeFacets } from '../facets'

beforeEach(async () => {
  await cleanDb()
})

describe('search.facets.computeFacets', () => {
  it('groups by category with counts', async () => {
    const cat1 = await prisma.category.create({
      data: { name: 'A', slug: `a-${Date.now()}` },
    })
    const cat2 = await prisma.category.create({
      data: { name: 'B', slug: `b-${Date.now() + 1}` },
    })
    const p1 = await prisma.product.create({
      data: {
        name: 'P1',
        slug: `p1-${Date.now()}`,
        sku: `S1-${Date.now()}`,
        basePrice: new Decimal(10),
        stockQuantity: 5,
        categoryId: cat1.id,
        isActive: true,
      },
    })
    const p2 = await prisma.product.create({
      data: {
        name: 'P2',
        slug: `p2-${Date.now() + 1}`,
        sku: `S2-${Date.now() + 1}`,
        basePrice: new Decimal(20),
        stockQuantity: 0,
        categoryId: cat1.id,
        isActive: true,
      },
    })
    const p3 = await prisma.product.create({
      data: {
        name: 'P3',
        slug: `p3-${Date.now() + 2}`,
        sku: `S3-${Date.now() + 2}`,
        basePrice: new Decimal(100),
        stockQuantity: 3,
        categoryId: cat2.id,
        isActive: true,
      },
    })

    const facets = await computeFacets([p1.id, p2.id, p3.id])
    expect(facets.categories).toHaveLength(2)
    expect(facets.categories.find((c) => c.id === cat1.id)?.count).toBe(2)
    expect(facets.categories.find((c) => c.id === cat2.id)?.count).toBe(1)
    expect(facets.inStockCount).toBe(2)
    expect(facets.priceBuckets[0]?.count).toBeGreaterThanOrEqual(2)
  })

  it('returns empty facets for empty product list', async () => {
    const facets = await computeFacets([])
    expect(facets.categories).toEqual([])
    expect(facets.inStockCount).toBe(0)
    expect(facets.priceBuckets.every((b) => b.count === 0)).toBe(true)
  })
})
