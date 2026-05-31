import { prisma } from '@/lib/db/client'
import { filterAccessibleIds } from '@/modules/search'
import type { Category, Product } from '@prisma/client'

export interface GetRelatedInput {
  productId: string
  orgId: string | null
  limit?: number
}

export type RelatedProduct = Product & { category: Category }

const DEFAULT_LIMIT = 8

export async function getRelatedProducts(input: GetRelatedInput): Promise<RelatedProduct[]> {
  const limit = input.limit ?? DEFAULT_LIMIT

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT p2.id
     FROM "Product" p1
     JOIN "Product" p2 ON p2.id <> p1.id
     WHERE p1.id = $1
       AND p1.embedding IS NOT NULL
       AND p2.embedding IS NOT NULL
       AND p2."isActive" = true
     ORDER BY p2.embedding <=> p1.embedding
     LIMIT $2`,
    input.productId,
    limit * 2
  )

  if (rows.length === 0) return []
  const candidateIds = rows.map((r) => r.id)
  const accessibleIds = await filterAccessibleIds(input.orgId, candidateIds)
  const top = accessibleIds.slice(0, limit)
  if (top.length === 0) return []

  const products = await prisma.product.findMany({
    where: { id: { in: top } },
    include: { category: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  return top.map((id) => byId.get(id)).filter((p): p is RelatedProduct => Boolean(p))
}

export interface GetPersonalizedInput {
  userId: string
  orgId: string | null
  limit?: number
}

export async function getPersonalizedRecommendations(
  input: GetPersonalizedInput
): Promise<RelatedProduct[]> {
  const limit = input.limit ?? DEFAULT_LIMIT

  const recentLines = await prisma.orderLine.findMany({
    where: { order: { placedByUserId: input.userId } },
    orderBy: { id: 'desc' },
    take: 20,
    select: { productId: true },
  })
  if (recentLines.length === 0) return []

  const purchased = new Set(recentLines.map((l) => l.productId))
  const seedIds = Array.from(purchased).slice(0, 3)

  const allCandidates: string[] = []
  for (const seed of seedIds) {
    const nbrs = await getRelatedProducts({ productId: seed, orgId: input.orgId, limit })
    for (const p of nbrs) {
      if (!purchased.has(p.id) && !allCandidates.includes(p.id)) {
        allCandidates.push(p.id)
      }
    }
  }
  if (allCandidates.length === 0) return []

  const top = allCandidates.slice(0, limit)
  const products = await prisma.product.findMany({
    where: { id: { in: top } },
    include: { category: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  return top.map((id) => byId.get(id)).filter((p): p is RelatedProduct => Boolean(p))
}
