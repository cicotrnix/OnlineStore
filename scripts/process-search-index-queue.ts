import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { processIndexQueue } from '@/modules/search/index-queue'

async function main() {
  const result = await processIndexQueue()
  logger.info({ result }, 'search index queue tick')
}

main()
  .catch((err) => {
    logger.error({ err }, 'process-search-index-queue failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
