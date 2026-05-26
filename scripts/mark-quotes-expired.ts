import { logger } from '@/lib/observability/logger'
import { markExpiredQuotes } from '@/modules/quotes'

async function main() {
  const result = await markExpiredQuotes()
  logger.info({ result }, 'mark-quotes-expired run')
}

main().catch((err) => {
  logger.error({ err }, 'mark-quotes-expired failed')
  process.exit(1)
})
