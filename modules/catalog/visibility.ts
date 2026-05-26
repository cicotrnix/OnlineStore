import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import type { Category, Product } from '@prisma/client'

type ProductWithCategory = Product & { category: Pick<Category, 'id' | 'isPrivate'> }

export async function filterForOrg<T extends ProductWithCategory>(
  orgId: string | null,
  products: T[]
): Promise<T[]> {
  if (!isFeatureEnabled('privateCatalogs')) return products

  if (orgId === null) {
    return products.filter((p) => !p.isPrivate && !p.category.isPrivate)
  }

  const [productAccess, categoryAccess] = await Promise.all([
    prisma.organizationCatalogAccess.findMany({
      where: { organizationId: orgId, productId: { not: null } },
      select: { productId: true },
    }),
    prisma.organizationCatalogAccess.findMany({
      where: { organizationId: orgId, categoryId: { not: null } },
      select: { categoryId: true },
    }),
  ])

  const productIds = new Set(productAccess.map((a) => a.productId as string))
  const categoryIds = new Set(categoryAccess.map((a) => a.categoryId as string))

  return products.filter((p) => {
    if (p.isPrivate) return productIds.has(p.id)
    if (p.category.isPrivate) return categoryIds.has(p.category.id) || productIds.has(p.id)
    return true
  })
}

export interface GrantAccessInput {
  organizationId: string
  productId?: string
  categoryId?: string
  grantedById: string
}

export async function grantAccess(input: GrantAccessInput): Promise<void> {
  if (Boolean(input.productId) === Boolean(input.categoryId)) {
    throw new Error('Exactly one of productId or categoryId required')
  }
  await prisma.organizationCatalogAccess.upsert({
    where: input.productId
      ? {
          organizationId_productId: {
            organizationId: input.organizationId,
            productId: input.productId,
          },
        }
      : {
          organizationId_categoryId: {
            organizationId: input.organizationId,
            categoryId: input.categoryId as string,
          },
        },
    create: {
      organizationId: input.organizationId,
      productId: input.productId ?? null,
      categoryId: input.categoryId ?? null,
      grantedById: input.grantedById,
    },
    update: {},
  })
}

export async function revokeAccess(input: Omit<GrantAccessInput, 'grantedById'>): Promise<void> {
  await prisma.organizationCatalogAccess.deleteMany({
    where: {
      organizationId: input.organizationId,
      productId: input.productId,
      categoryId: input.categoryId,
    },
  })
}
