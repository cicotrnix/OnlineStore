import { logger } from '@/lib/observability/logger'
import { sendInvoiceDueSoon } from '@/modules/accounts'

async function main() {
  const result = await sendInvoiceDueSoon()
  logger.info({ result }, 'send-invoice-due-soon run')
}

main().catch((err) => {
  logger.error({ err }, 'send-invoice-due-soon failed')
  process.exit(1)
})
