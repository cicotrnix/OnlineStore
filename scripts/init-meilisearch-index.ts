import { SEARCH_INDEX_NAME, getMeilisearchClient } from '@/lib/meilisearch'
import { logger } from '@/lib/observability/logger'

async function main() {
  const client = getMeilisearchClient()
  await client.createIndex(SEARCH_INDEX_NAME, { primaryKey: 'id' }).catch((err: unknown) => {
    if (err instanceof Error && /already exists/i.test(err.message)) return
    throw err
  })

  const index = client.index(SEARCH_INDEX_NAME)

  await index.updateSettings({
    searchableAttributes: ['name', 'description', 'sku', 'categoryName'],
    filterableAttributes: [
      'categoryId',
      'categoryIsPrivate',
      'isPrivate',
      'isActive',
      'basePrice',
      'stockQuantity',
    ],
    sortableAttributes: ['basePrice', 'createdAt'],
    displayedAttributes: ['id'],
    stopWords: ['el', 'la', 'de', 'para', 'con', 'en', 'y', 'a'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  })

  logger.info({ index: SEARCH_INDEX_NAME }, 'meilisearch index initialized')
}

main().catch((err) => {
  logger.error({ err }, 'init-meilisearch-index failed')
  process.exit(1)
})
