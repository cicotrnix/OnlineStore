import { prisma } from '@/lib/db/client'
import {
  SEARCH_INDEX_NAME,
  buildAccessFilter,
  getMeilisearchClient,
  isMeilisearchEnabled,
} from '@/lib/meilisearch'
import { logger } from '@/lib/observability/logger'
import { isVoyageEnabled } from '@/lib/voyage'
import { getStoreConfig } from '@/stores'
import type { Category, Product } from '@prisma/client'
import { filterAccessibleIds, getAccessGrants } from './access'
import { embedSearchQuery, formatVectorForPostgres } from './embeddings'
import { type FacetCounts, computeFacets } from './facets'
import { mergeRankings } from './rrf'

export interface QueryInput {
  q: string
  orgId: string | null
  facets?: {
    categoryIds?: string[]
    priceMin?: number
    priceMax?: number
    inStockOnly?: boolean
  }
  limit?: number
  offset?: number
}

export type SearchMode = 'hybrid' | 'meili-only' | 'vector-only' | 'fallback-like' | 'exact-sku'

export interface QueryResult {
  hits: (Product & { category: Category })[]
  facetCounts: FacetCounts
  total: number
  mode: SearchMode
}

const SKU_REGEX = /^[A-Z0-9-]{3,32}$/i
const HARVEST_LIMIT = 50

export async function query(input: QueryInput): Promise<QueryResult> {
  const limit = input.limit ?? 24
  const offset = input.offset ?? 0
  const q = input.q.trim()

  if (SKU_REGEX.test(q)) {
    const exact = await tryExactSku(q, input.orgId)
    if (exact) return exact
  }

  const accessFilter = await buildFilterForRequest(input.orgId, input.facets)
  const semanticOn = isVoyageEnabled() && getStoreConfig().modules?.semanticSearch !== false

  const [meiliIds, vectorIds] = await Promise.all([
    fetchMeiliIds(q, accessFilter.meili).catch((err) => {
      logger.warn({ err }, 'meilisearch failed')
      return [] as string[]
    }),
    semanticOn
      ? fetchVectorIds(q).catch((err) => {
          logger.warn({ err }, 'pgvector failed')
          return [] as string[]
        })
      : Promise.resolve<string[]>([]),
  ])

  if (meiliIds.length === 0 && vectorIds.length === 0) {
    return fallbackLike(q, input.orgId, limit, offset)
  }

  const merged = mergeRankings(meiliIds, vectorIds)
  const mergedIds = merged.map((m) => m.id)
  const accessibleIds = await filterAccessibleIds(input.orgId, mergedIds)

  const pageIds = accessibleIds.slice(offset, offset + limit)
  const products = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    include: { category: true },
  })
  const ordered = pageIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)

  const facetCounts = await computeFacets(accessibleIds)

  const mode: SearchMode =
    vectorIds.length > 0 && meiliIds.length > 0
      ? 'hybrid'
      : vectorIds.length > 0
        ? 'vector-only'
        : 'meili-only'

  return { hits: ordered, facetCounts, total: accessibleIds.length, mode }
}

async function buildFilterForRequest(
  orgId: string | null,
  facets: QueryInput['facets']
): Promise<{ meili: string }> {
  const grants = orgId ? await getAccessGrants(orgId) : { productIds: [], categoryIds: [] }
  const baseMeili = buildAccessFilter({
    anonymous: orgId === null,
    grantedProductIds: grants.productIds,
    grantedCategoryIds: grants.categoryIds,
  })

  const extras: string[] = []
  if (facets?.categoryIds?.length) {
    extras.push(`categoryId IN [${facets.categoryIds.map((c) => `"${c}"`).join(',')}]`)
  }
  if (facets?.priceMin != null) extras.push(`basePrice >= ${facets.priceMin}`)
  if (facets?.priceMax != null) extras.push(`basePrice < ${facets.priceMax}`)
  if (facets?.inStockOnly) extras.push('stockQuantity > 0')

  return { meili: [baseMeili, ...extras].join(' AND ') }
}

async function fetchMeiliIds(q: string, filter: string): Promise<string[]> {
  if (!isMeilisearchEnabled() || q.length === 0) return []
  const result = await getMeilisearchClient()
    .index(SEARCH_INDEX_NAME)
    .search<{ id: string }>(q, {
      limit: HARVEST_LIMIT,
      filter,
      attributesToRetrieve: ['id'],
    })
  return result.hits.map((h) => h.id)
}

async function fetchVectorIds(q: string): Promise<string[]> {
  if (q.length < 2) return []
  const vec = await embedSearchQuery(q)
  const literal = formatVectorForPostgres(vec)
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Product"
     WHERE "isActive" = true AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT ${HARVEST_LIMIT}`,
    literal
  )
  return rows.map((r) => r.id)
}

async function tryExactSku(sku: string, orgId: string | null): Promise<QueryResult | null> {
  const product = await prisma.product.findFirst({
    where: { sku: { equals: sku, mode: 'insensitive' }, isActive: true },
    include: { category: true },
  })
  if (!product) return null
  const accessible = await filterAccessibleIds(orgId, [product.id])
  if (accessible.length === 0) return null
  const facetCounts = await computeFacets([product.id])
  return { hits: [product], facetCounts, total: 1, mode: 'exact-sku' }
}

async function fallbackLike(
  q: string,
  orgId: string | null,
  limit: number,
  offset: number
): Promise<QueryResult> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: { category: true },
    take: limit,
    skip: offset,
  })
  const accessibleIds = await filterAccessibleIds(
    orgId,
    products.map((p) => p.id)
  )
  const filtered = products.filter((p) => accessibleIds.includes(p.id))
  const facetCounts = await computeFacets(accessibleIds)
  return { hits: filtered, facetCounts, total: accessibleIds.length, mode: 'fallback-like' }
}
