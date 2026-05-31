import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'

async function makeProductWithEmbedding(suffix: string, vec: number[]) {
  const cat = await prisma.category.create({ data: { slug: `c-${suffix}`, name: 'C' } })
  const p = await prisma.product.create({
    data: {
      sku: `S-${suffix}`,
      slug: `s-${suffix}`,
      name: `P-${suffix}`,
      basePrice: new Decimal('1.00'),
      categoryId: cat.id,
      isActive: true,
    },
  })
  const literal = `[${vec.join(',')}]`
  await prisma.$executeRawUnsafe(
    `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
    literal,
    p.id
  )
  return p
}

function makeVec(seed: number): number[] {
  const a = new Array(512).fill(0)
  a[0] = seed
  a[1] = 1 - seed
  return a
}

beforeEach(async () => {
  await cleanDb()
})

describe('getRelatedProducts', () => {
  it('devuelve vecinos pgvector excluyendo el producto base', async () => {
    const a = await makeProductWithEmbedding(`a-${Date.now()}`, makeVec(0.9))
    const b = await makeProductWithEmbedding(`b-${Date.now() + 1}`, makeVec(0.85))
    const c = await makeProductWithEmbedding(`c-${Date.now() + 2}`, makeVec(0.1))

    const { getRelatedProducts } = await import('../service')
    const result = await getRelatedProducts({ productId: a.id, orgId: null, limit: 5 })

    expect(result.map((p) => p.id)).not.toContain(a.id)
    expect(result.map((p) => p.id)).toContain(b.id)
    expect(result.map((p) => p.id)).toContain(c.id)
    expect(result[0]?.id).toBe(b.id)
  })

  it('devuelve lista vacía si producto base no tiene embedding', async () => {
    const cat = await prisma.category.create({
      data: { slug: `c-empty-${Date.now()}`, name: 'C' },
    })
    const p = await prisma.product.create({
      data: {
        sku: `S-empty-${Date.now()}`,
        slug: `s-empty-${Date.now()}`,
        name: 'X',
        basePrice: new Decimal('1.00'),
        categoryId: cat.id,
        isActive: true,
      },
    })
    const { getRelatedProducts } = await import('../service')
    expect(await getRelatedProducts({ productId: p.id, orgId: null, limit: 5 })).toEqual([])
  })
})
