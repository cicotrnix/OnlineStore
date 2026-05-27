import { Meilisearch } from 'meilisearch'

let cached: Meilisearch | null = null

export function isMeilisearchEnabled(): boolean {
  return Boolean(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY)
}

export function getMeilisearchClient(): Meilisearch {
  if (!isMeilisearchEnabled()) {
    throw new Error('Meilisearch not configured: missing MEILISEARCH_HOST or MEILISEARCH_API_KEY')
  }
  if (!cached) {
    cached = new Meilisearch({
      host: process.env.MEILISEARCH_HOST as string,
      apiKey: process.env.MEILISEARCH_API_KEY as string,
    })
  }
  return cached
}

export interface AccessFilterInput {
  anonymous?: boolean
  grantedProductIds?: string[]
  grantedCategoryIds?: string[]
}

export function buildAccessFilter(input: AccessFilterInput): string {
  const parts: string[] = ['isActive = true']

  if (input.anonymous) {
    parts.push('isPrivate = false')
    parts.push('categoryIsPrivate = false')
    return parts.join(' AND ')
  }

  const grantedProducts = input.grantedProductIds ?? []
  const grantedCategories = input.grantedCategoryIds ?? []

  const productList =
    grantedProducts.length > 0
      ? `id IN [${grantedProducts.map((id) => `"${id}"`).join(',')}]`
      : null
  const categoryList =
    grantedCategories.length > 0
      ? `categoryId IN [${grantedCategories.map((id) => `"${id}"`).join(',')}]`
      : null

  const productClause = productList ? `(isPrivate = false OR ${productList})` : 'isPrivate = false'
  const categoryClause =
    categoryList || productList
      ? `(categoryIsPrivate = false${categoryList ? ` OR ${categoryList}` : ''}${productList ? ` OR ${productList}` : ''})`
      : 'categoryIsPrivate = false'

  parts.push(productClause)
  parts.push(categoryClause)
  return parts.join(' AND ')
}

export const SEARCH_INDEX_NAME = 'products'
