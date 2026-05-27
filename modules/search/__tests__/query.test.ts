import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/meilisearch', () => ({
  isMeilisearchEnabled: vi.fn().mockReturnValue(true),
  getMeilisearchClient: vi.fn().mockReturnValue({
    index: () => ({
      search: vi
        .fn()
        .mockResolvedValue({ hits: [{ id: 'fixedp1' }, { id: 'fixedp2' }], estimatedTotalHits: 2 }),
    }),
  }),
  SEARCH_INDEX_NAME: 'products',
  buildAccessFilter: vi.fn().mockReturnValue('isActive = true AND isPrivate = false'),
}))

vi.mock('@/lib/voyage', () => ({
  isVoyageEnabled: vi.fn().mockReturnValue(false),
  embedQuery: vi.fn(),
  embedDocument: vi.fn(),
}))

beforeEach(async () => {
  await cleanDb()
})

describe('search.query', () => {
  it('returns hits hydrated from postgres in RRF order', async () => {
    const { query } = await import('../query')
    const cat = await prisma.category.create({
      data: { name: 'C', slug: `q-${Date.now()}` },
    })
    await prisma.product.create({
      data: {
        id: 'fixedp1',
        name: 'P1',
        slug: `p1-${Date.now()}`,
        sku: `SK1-${Date.now()}`,
        basePrice: new Decimal(10),
        stockQuantity: 1,
        categoryId: cat.id,
        isActive: true,
      },
    })
    await prisma.product.create({
      data: {
        id: 'fixedp2',
        name: 'P2',
        slug: `p2-${Date.now()}`,
        sku: `SK2-${Date.now()}`,
        basePrice: new Decimal(20),
        stockQuantity: 1,
        categoryId: cat.id,
        isActive: true,
      },
    })

    const result = await query({ q: 'test', orgId: null })

    expect(result.hits.map((h) => h.id)).toEqual(['fixedp1', 'fixedp2'])
    expect(result.total).toBe(2)
    expect(result.mode).toBe('meili-only')
  })

  it('falls back to LIKE when meilisearch returns nothing', async () => {
    // override mock for this test
    const meili = await import('@/lib/meilisearch')
    vi.mocked(meili.getMeilisearchClient).mockReturnValueOnce({
      index: () =>
        ({
          search: vi.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0 }),
        }) as never,
    } as never)

    const { query } = await import('../query')
    const cat = await prisma.category.create({
      data: { name: 'C', slug: `qf-${Date.now()}` },
    })
    await prisma.product.create({
      data: {
        name: 'Tornillo de acero',
        slug: `tor-${Date.now()}`,
        sku: `TOR-${Date.now()}`,
        basePrice: new Decimal(5),
        stockQuantity: 10,
        categoryId: cat.id,
        isActive: true,
      },
    })

    const result = await query({ q: 'tornillo', orgId: null })
    expect(result.mode).toBe('fallback-like')
    expect(result.hits.some((h) => h.name.includes('Tornillo'))).toBe(true)
  })
})
