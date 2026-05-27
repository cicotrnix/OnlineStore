import { prisma } from '@/lib/db/client'

export interface PriceBucket {
  min: number
  max: number | null
  label: string
  count: number
}

export const PRICE_BUCKETS: Omit<PriceBucket, 'count'>[] = [
  { min: 0, max: 50, label: '$0 - $50' },
  { min: 50, max: 200, label: '$50 - $200' },
  { min: 200, max: 1000, label: '$200 - $1,000' },
  { min: 1000, max: null, label: '$1,000+' },
]

export interface FacetCounts {
  categories: { id: string; name: string; count: number }[]
  priceBuckets: PriceBucket[]
  inStockCount: number
  total: number
}

export async function computeFacets(productIds: string[]): Promise<FacetCounts> {
  if (productIds.length === 0) {
    return {
      categories: [],
      priceBuckets: PRICE_BUCKETS.map((b) => ({ ...b, count: 0 })),
      inStockCount: 0,
      total: 0,
    }
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      categoryId: true,
      category: { select: { name: true } },
      basePrice: true,
      stockQuantity: true,
    },
  })

  const catMap = new Map<string, { name: string; count: number }>()
  for (const p of products) {
    const entry = catMap.get(p.categoryId) ?? { name: p.category.name, count: 0 }
    entry.count++
    catMap.set(p.categoryId, entry)
  }
  const categories = Array.from(catMap.entries())
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)

  const priceBuckets = PRICE_BUCKETS.map((b) => ({ ...b, count: 0 }))
  for (const p of products) {
    const price = p.basePrice.toNumber()
    for (const bucket of priceBuckets) {
      if (price >= bucket.min && (bucket.max === null || price < bucket.max)) {
        bucket.count++
        break
      }
    }
  }

  const inStockCount = products.filter((p) => p.stockQuantity > 0).length

  return { categories, priceBuckets, inStockCount, total: products.length }
}
