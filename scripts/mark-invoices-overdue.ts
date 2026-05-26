import { logger } from '@/lib/observability/logger'
import { markInvoicesOverdue } from '@/modules/accounts'

async function main() {
  const result = await markInvoicesOverdue()
  logger.info({ result }, 'mark-invoices-overdue run')
}

main().catch((err) => {
  logger.error({ err }, 'mark-invoices-overdue failed')
  process.exit(1)
})
