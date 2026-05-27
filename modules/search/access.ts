import { prisma } from '@/lib/db/client'
import { filterForOrg } from '@/modules/catalog'
import type { Category, Product } from '@prisma/client'

export interface AccessGrants {
  productIds: string[]
  categoryIds: string[]
}

export async function getAccessGrants(organizationId: string): Promise<AccessGrants> {
  const [productAccess, categoryAccess] = await Promise.all([
    prisma.organizationCatalogAccess.findMany({
      where: { organizationId, productId: { not: null } },
      select: { productId: true },
    }),
    prisma.organizationCatalogAccess.findMany({
      where: { organizationId, categoryId: { not: null } },
      select: { categoryId: true },
    }),
  ])

  return {
    productIds: productAccess.map((a) => a.productId as string),
    categoryIds: categoryAccess.map((a) => a.categoryId as string),
  }
}

/**
 * Defense-in-depth post-filter applied to RRF result IDs.
 * Meilisearch filter pushdown already excludes inaccessible items; this catches leakage.
 */
export async function filterAccessibleIds(
  orgId: string | null,
  productIds: string[]
): Promise<string[]> {
  if (productIds.length === 0) return []

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: { select: { id: true, isPrivate: true } } },
  })

  const accessible = await filterForOrg(
    orgId,
    products as (Product & { category: Pick<Category, 'id' | 'isPrivate'> })[]
  )
  return accessible.map((p) => p.id)
}
