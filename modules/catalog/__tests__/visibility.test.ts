import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { filterForOrg, grantAccess, revokeAccess } from '../visibility'

beforeEach(cleanDb)

// Force-enable privateCatalogs for these tests
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

async function makeOrg(slug: string) {
  return prisma.organization.create({
    data: { name: 'O', slug, paymentTerms: 'PREPAID' },
  })
}

async function makeProduct(slug: string, isPrivate: boolean, categoryPrivate = false) {
  const cat = await prisma.category.create({
    data: { name: 'C', slug: `cat-${slug}`, isPrivate: categoryPrivate },
  })
  return prisma.product.create({
    data: {
      name: 'P',
      slug: `prod-${slug}`,
      sku: `SKU-${slug}`,
      basePrice: new Decimal('10'),
      stockQuantity: 5,
      isActive: true,
      categoryId: cat.id,
      isPrivate,
    },
    include: { category: true },
  })
}

describe('catalog.filterForOrg', () => {
  it('shows public products to any org', async () => {
    const org = await makeOrg('vis-1')
    const p = await makeProduct('vis-pub', false, false)
    const result = await filterForOrg(org.id, [p])
    expect(result.map((x) => x.id)).toContain(p.id)
  })

  it('hides private products without grant', async () => {
    const org = await makeOrg('vis-2')
    const p = await makeProduct('vis-priv', true, false)
    const result = await filterForOrg(org.id, [p])
    expect(result.length).toBe(0)
  })

  it('shows private product to org with explicit grant', async () => {
    const admin = await prisma.user.create({
      data: { email: 'g@test.com', name: 'G', isPlatformAdmin: true },
    })
    const org = await makeOrg('vis-3')
    const p = await makeProduct('vis-grant', true, false)
    await grantAccess({ organizationId: org.id, productId: p.id, grantedById: admin.id })
    const result = await filterForOrg(org.id, [p])
    expect(result.length).toBe(1)
  })

  it('null orgId (anonymous) blocked from private category even with public product', async () => {
    const p = await makeProduct('vis-anon', false, true)
    const result = await filterForOrg(null, [p])
    expect(result.length).toBe(0)
  })

  it('revokeAccess removes grant', async () => {
    const admin = await prisma.user.create({
      data: { email: 'rv@test.com', name: 'R', isPlatformAdmin: true },
    })
    const org = await makeOrg('vis-4')
    const p = await makeProduct('vis-rev', true, false)
    await grantAccess({ organizationId: org.id, productId: p.id, grantedById: admin.id })
    await revokeAccess({ organizationId: org.id, productId: p.id })
    const result = await filterForOrg(org.id, [p])
    expect(result.length).toBe(0)
  })
})
