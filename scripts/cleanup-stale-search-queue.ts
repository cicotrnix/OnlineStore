import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'

async function main() {
  const result = await prisma.searchIndexQueue.updateMany({
    where: {
      status: 'PROCESSING',
      enqueuedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
    },
    data: { status: 'PENDING' },
  })
  logger.info({ resetCount: result.count }, 'cleanup-stale-search-queue run')
}

main()
  .catch((err) => {
    logger.error({ err }, 'cleanup-stale-search-queue failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
