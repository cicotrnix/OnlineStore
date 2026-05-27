import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const meiliSearchMock = vi.fn()

vi.mock('@/lib/meilisearch', () => ({
  isMeilisearchEnabled: vi.fn().mockReturnValue(true),
  getMeilisearchClient: vi.fn().mockReturnValue({
    index: () => ({ search: meiliSearchMock }),
  }),
  SEARCH_INDEX_NAME: 'products',
  buildAccessFilter: vi.fn().mockReturnValue('isActive = true'),
}))

vi.mock('@/lib/voyage', () => ({
  isVoyageEnabled: vi.fn().mockReturnValue(false),
  embedQuery: vi.fn(),
  embedDocument: vi.fn(),
}))

beforeEach(async () => {
  await cleanDb()
  meiliSearchMock.mockClear()
})

describe('search.query exact SKU', () => {
  it('returns matching product directly without hitting Meilisearch', async () => {
    const { query } = await import('../query')
    const cat = await prisma.category.create({
      data: { name: 'C', slug: `sku-${Date.now()}` },
    })
    await prisma.product.create({
      data: {
        name: 'Special',
        slug: `sp-${Date.now()}`,
        sku: 'COS-EXACT-001',
        basePrice: new Decimal(10),
        stockQuantity: 1,
        categoryId: cat.id,
        isActive: true,
      },
    })

    const result = await query({ q: 'COS-EXACT-001', orgId: null })

    expect(result.mode).toBe('exact-sku')
    expect(result.hits).toHaveLength(1)
    expect(result.hits[0]?.sku).toBe('COS-EXACT-001')
    expect(meiliSearchMock).not.toHaveBeenCalled()
  })
})
