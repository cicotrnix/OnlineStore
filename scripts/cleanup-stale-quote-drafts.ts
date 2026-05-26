import { logger } from '@/lib/observability/logger'
import { cleanupStaleDrafts } from '@/modules/quotes'

async function main() {
  const result = await cleanupStaleDrafts(30)
  logger.info({ result }, 'cleanup-stale-quote-drafts run')
}

main().catch((err) => {
  logger.error({ err }, 'cleanup-stale-quote-drafts failed')
  process.exit(1)
})
