import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enqueueIndex, processIndexQueue } from '../index-queue'

vi.mock('@/lib/meilisearch', () => ({
  isMeilisearchEnabled: vi.fn().mockReturnValue(false),
  getMeilisearchClient: vi.fn(),
  SEARCH_INDEX_NAME: 'products',
}))

vi.mock('@/lib/voyage', () => ({
  isVoyageEnabled: vi.fn().mockReturnValue(false),
}))

beforeEach(async () => {
  await cleanDb()
})

async function makeProduct(suffix: string) {
  const cat = await prisma.category.create({
    data: { name: 'C', slug: `c-${suffix}` },
  })
  return prisma.product.create({
    data: {
      name: `P-${suffix}`,
      slug: `p-${suffix}`,
      sku: `SK-${suffix}`,
      basePrice: new Decimal(10),
      stockQuantity: 1,
      categoryId: cat.id,
      isActive: true,
    },
  })
}

describe('search.enqueueIndex', () => {
  it('creates a PENDING entry for a new product', async () => {
    const p = await makeProduct(`a-${Date.now()}`)
    await enqueueIndex(p.id, 'UPSERT')
    const rows = await prisma.searchIndexQueue.findMany({ where: { productId: p.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.action).toBe('UPSERT')
    expect(rows[0]?.status).toBe('PENDING')
  })

  it('is idempotent: second enqueue while PENDING does not duplicate', async () => {
    const p = await makeProduct(`b-${Date.now()}`)
    await enqueueIndex(p.id, 'UPSERT')
    await enqueueIndex(p.id, 'UPSERT')
    const rows = await prisma.searchIndexQueue.findMany({
      where: { productId: p.id, status: 'PENDING' },
    })
    expect(rows).toHaveLength(1)
  })

  it('allows new PENDING after previous DONE', async () => {
    const p = await makeProduct(`c-${Date.now()}`)
    await enqueueIndex(p.id, 'UPSERT')
    await prisma.searchIndexQueue.updateMany({
      where: { productId: p.id },
      data: { status: 'DONE', processedAt: new Date() },
    })
    await enqueueIndex(p.id, 'UPSERT')
    const allRows = await prisma.searchIndexQueue.findMany({ where: { productId: p.id } })
    expect(allRows).toHaveLength(2)
    expect(allRows.filter((r) => r.status === 'PENDING')).toHaveLength(1)
  })
})

describe('search.processIndexQueue', () => {
  it('processes a single PENDING UPSERT and marks DONE', async () => {
    const p = await makeProduct(`pq-a-${Date.now()}`)
    await enqueueIndex(p.id, 'UPSERT')
    const result = await processIndexQueue()
    expect(result.processed).toBe(1)
    const row = await prisma.searchIndexQueue.findFirst({ where: { productId: p.id } })
    expect(row?.status).toBe('DONE')
    expect(row?.processedAt).not.toBeNull()
  })

  it('skips items already PROCESSING', async () => {
    const p = await makeProduct(`pq-b-${Date.now()}`)
    await prisma.searchIndexQueue.create({
      data: { productId: p.id, action: 'UPSERT', status: 'PROCESSING' },
    })
    const result = await processIndexQueue()
    expect(result.processed).toBe(0)
  })

  it('promotes UPSERT to DELETE when product is inactive', async () => {
    const p = await makeProduct(`pq-c-${Date.now()}`)
    await prisma.product.update({ where: { id: p.id }, data: { isActive: false } })
    await enqueueIndex(p.id, 'UPSERT')
    const result = await processIndexQueue()
    expect(result.processed).toBe(1)
    const refreshed = await prisma.product.findUnique({ where: { id: p.id } })
    expect(refreshed?.searchableText).toBeNull()
  })
})
