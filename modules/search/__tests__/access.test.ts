import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterAccessibleIds, getAccessGrants } from '../access'

vi.mock('@/stores', async () => {
  const actual = await vi.importActual<typeof import('@/stores')>('@/stores')
  const base = actual.getStoreConfig()
  return {
    ...actual,
    getStoreConfig: () => ({
      ...base,
      modules: { ...base.modules, privateCatalogs: true },
    }),
  }
})

beforeEach(async () => {
  await cleanDb()
})

describe('search.access.getAccessGrants', () => {
  it('returns empty arrays for org with no grants', async () => {
    const org = await prisma.organization.create({
      data: { name: 'O', slug: `noaccess-${Date.now()}`, creditUsed: new Decimal(0) },
    })
    const grants = await getAccessGrants(org.id)
    expect(grants.productIds).toEqual([])
    expect(grants.categoryIds).toEqual([])
  })

  it('returns granted ids for org with grants', async () => {
    const admin = await prisma.user.create({
      data: { email: `a-${Date.now()}@a.com`, name: 'A', isPlatformAdmin: true },
    })
    const org = await prisma.organization.create({
      data: { name: 'O', slug: `acc-${Date.now()}`, creditUsed: new Decimal(0) },
    })
    const cat = await prisma.category.create({
      data: { name: 'C', slug: `cat-${Date.now()}`, isPrivate: true },
    })
    const prod = await prisma.product.create({
      data: {
        name: 'P',
        slug: `p-${Date.now()}`,
        sku: `SK-${Date.now()}`,
        basePrice: new Decimal(10),
        stockQuantity: 1,
        categoryId: cat.id,
        isActive: true,
        isPrivate: true,
      },
    })
    await prisma.organizationCatalogAccess.create({
      data: { organizationId: org.id, productId: prod.id, grantedById: admin.id },
    })

    const grants = await getAccessGrants(org.id)
    expect(grants.productIds).toContain(prod.id)
  })
})

describe('search.access.filterAccessibleIds', () => {
  it('returns empty when no ids passed', async () => {
    expect(await filterAccessibleIds(null, [])).toEqual([])
  })

  it('drops private products for anonymous', async () => {
    const cat = await prisma.category.create({
      data: { name: 'C', slug: `pub-${Date.now()}`, isPrivate: false },
    })
    const prod = await prisma.product.create({
      data: {
        name: 'priv',
        slug: `priv-${Date.now()}`,
        sku: `PRV-${Date.now()}`,
        basePrice: new Decimal(10),
        stockQuantity: 1,
        categoryId: cat.id,
        isActive: true,
        isPrivate: true,
      },
    })
    const ids = await filterAccessibleIds(null, [prod.id])
    expect(ids).toEqual([])
  })
})
