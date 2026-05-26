import { logger } from '@/lib/observability/logger'
import { sendExpiringSoon } from '@/modules/quotes'

async function main() {
  const result = await sendExpiringSoon()
  logger.info({ result }, 'send-quote-expiring-soon run')
}

main().catch((err) => {
  logger.error({ err }, 'send-quote-expiring-soon failed')
  process.exit(1)
})
