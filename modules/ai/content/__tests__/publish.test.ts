import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/search', () => ({
  enqueueIndex: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(async () => {
  await cleanDb()
  vi.clearAllMocks()
})

describe('publishContent', () => {
  it('transiciona DRAFT → PUBLISHED y encola reindex', async () => {
    const admin = await prisma.user.create({
      data: { email: `a-${Date.now()}@x.com`, isPlatformAdmin: true },
    })
    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'C' } })
    const p = await prisma.product.create({
      data: {
        sku: `S-${Date.now()}`,
        slug: `s-${Date.now()}`,
        name: 'P',
        basePrice: '1.00',
        categoryId: cat.id,
      },
    })
    await prisma.productContent.create({
      data: { productId: p.id, locale: 'en-US', shortDescription: 'X', status: 'DRAFT' },
    })

    const { publishContent } = await import('../publish')
    const { enqueueIndex } = await import('@/modules/search')
    await publishContent({ productId: p.id, locale: 'en-US', byUserId: admin.id })

    const row = await prisma.productContent.findFirst({
      where: { productId: p.id, locale: 'en-US' },
    })
    expect(row?.status).toBe('PUBLISHED')
    expect(enqueueIndex).toHaveBeenCalledWith(p.id, 'UPSERT')
  })

  it('rechaza si el user no es platform admin', async () => {
    const user = await prisma.user.create({
      data: { email: `u-${Date.now()}@x.com`, isPlatformAdmin: false },
    })
    const cat = await prisma.category.create({ data: { slug: `c-${Date.now()}`, name: 'C' } })
    const p = await prisma.product.create({
      data: {
        sku: `S-${Date.now()}`,
        slug: `s-${Date.now()}`,
        name: 'P',
        basePrice: '1.00',
        categoryId: cat.id,
      },
    })
    await prisma.productContent.create({
      data: { productId: p.id, locale: 'en-US', status: 'DRAFT' },
    })
    const { publishContent } = await import('../publish')
    await expect(
      publishContent({ productId: p.id, locale: 'en-US', byUserId: user.id })
    ).rejects.toThrow(/admin/i)
  })
})
