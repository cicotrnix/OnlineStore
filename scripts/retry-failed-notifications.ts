import { logger } from '@/lib/observability/logger'
import { retryFailedEmails } from '@/modules/notifications'

async function main() {
  const result = await retryFailedEmails()
  logger.info({ result }, 'retry-failed-notifications run')
}

main().catch((err) => {
  logger.error({ err }, 'retry-failed-notifications failed')
  process.exit(1)
})
