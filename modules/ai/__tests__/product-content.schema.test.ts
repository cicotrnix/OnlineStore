import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'

describe('ProductContent', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('permite EN y ES por producto, único por (productId, locale)', async () => {
    const cat = await prisma.category.create({
      data: { slug: `c-${Date.now()}`, name: 'C' },
    })
    const p = await prisma.product.create({
      data: {
        sku: `S-${Date.now()}`,
        slug: `s-${Date.now()}`,
        name: 'P',
        basePrice: '1.00',
        categoryId: cat.id,
        compatibleModels: ['iPhone 14'],
        attributes: { capacity_mah: '3279' },
      },
    })
    await prisma.productContent.create({
      data: { productId: p.id, locale: 'en-US', shortDescription: 'EN' },
    })
    await prisma.productContent.create({
      data: { productId: p.id, locale: 'es-419', shortDescription: 'ES' },
    })
    await expect(
      prisma.productContent.create({
        data: { productId: p.id, locale: 'en-US', shortDescription: 'dup' },
      })
    ).rejects.toThrow()
    const all = await prisma.productContent.findMany({ where: { productId: p.id } })
    expect(all).toHaveLength(2)
  })
})
