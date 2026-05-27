import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { enqueueIndex } from '@/modules/search'

async function main() {
  const products = await prisma.product.findMany({ select: { id: true } })
  let enqueued = 0
  for (const p of products) {
    await enqueueIndex(p.id, 'UPSERT')
    enqueued++
  }
  logger.info({ enqueued, total: products.length }, 'bootstrap-search-index enqueued all products')
}

main()
  .catch((err) => {
    logger.error({ err }, 'bootstrap-search-index failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
