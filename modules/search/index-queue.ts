import { prisma } from '@/lib/db/client'
import { SEARCH_INDEX_NAME, getMeilisearchClient, isMeilisearchEnabled } from '@/lib/meilisearch'
import { logger } from '@/lib/observability/logger'
import { isVoyageEnabled } from '@/lib/voyage'
import { getStoreConfig } from '@/stores'
import type { SearchIndexAction } from '@prisma/client'
import { buildSearchableText, embedProductText, formatVectorForPostgres } from './embeddings'

const BATCH_SIZE = 20
const MAX_ATTEMPTS = 5

export async function enqueueIndex(productId: string, action: SearchIndexAction): Promise<void> {
  const existing = await prisma.searchIndexQueue.findFirst({
    where: { productId, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) return

  await prisma.searchIndexQueue.create({
    data: { productId, action, status: 'PENDING' },
  })
}

export interface ProcessResult {
  processed: number
  failed: number
  errors: { productId: string; error: string }[]
}

export async function processIndexQueue(): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, failed: 0, errors: [] }

  const batch = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`
      SELECT id FROM "SearchIndexQueue"
      WHERE status = 'PENDING'
      ORDER BY "enqueuedAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `)
    if (rows.length === 0) return []
    await tx.searchIndexQueue.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { status: 'PROCESSING' },
    })
    return tx.searchIndexQueue.findMany({ where: { id: { in: rows.map((r) => r.id) } } })
  })

  for (const item of batch) {
    try {
      await processItem(item.productId, item.action)
      await prisma.searchIndexQueue.update({
        where: { id: item.id },
        data: { status: 'DONE', processedAt: new Date(), lastError: null },
      })
      result.processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const attempts = item.attempts + 1
      const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'
      await prisma.searchIndexQueue.update({
        where: { id: item.id },
        data: { status, attempts, lastError: message, processedAt: new Date() },
      })
      result.failed++
      result.errors.push({ productId: item.productId, error: message })
      logger.error(
        { productId: item.productId, attempt: attempts, err: message },
        'search index queue error'
      )
    }
  }

  return result
}

async function processItem(productId: string, action: SearchIndexAction): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { id: true, name: true, isPrivate: true } } },
  })

  const effectiveAction: SearchIndexAction =
    action === 'UPSERT' && (!product || !product.isActive) ? 'DELETE' : action

  if (effectiveAction === 'DELETE') {
    if (isMeilisearchEnabled()) {
      await getMeilisearchClient().index(SEARCH_INDEX_NAME).deleteDocument(productId)
    }
    if (product) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET embedding = NULL, "embeddingUpdatedAt" = NULL, "searchableText" = NULL WHERE id = $1`,
        productId
      )
    }
    return
  }

  if (!product) return
  const newText = buildSearchableText(product)
  const semanticOn = getStoreConfig().modules?.semanticSearch !== false
  const shouldEmbed = isVoyageEnabled() && semanticOn && product.searchableText !== newText

  if (shouldEmbed) {
    const vector = await embedProductText(newText)
    const literal = formatVectorForPostgres(vector)
    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = $1::vector, "embeddingUpdatedAt" = NOW(), "searchableText" = $2 WHERE id = $3`,
      literal,
      newText,
      productId
    )
  } else if (product.searchableText !== newText) {
    await prisma.product.update({
      where: { id: productId },
      data: { searchableText: newText },
    })
  }

  if (isMeilisearchEnabled()) {
    await getMeilisearchClient()
      .index(SEARCH_INDEX_NAME)
      .updateDocuments([
        {
          id: product.id,
          name: product.name,
          description: product.description ?? '',
          sku: product.sku,
          categoryId: product.categoryId,
          categoryName: product.category.name,
          categoryIsPrivate: product.category.isPrivate,
          isPrivate: product.isPrivate,
          isActive: product.isActive,
          basePrice: product.basePrice.toNumber(),
          stockQuantity: product.stockQuantity,
          createdAt: product.createdAt.getTime(),
        },
      ])
  }
}
