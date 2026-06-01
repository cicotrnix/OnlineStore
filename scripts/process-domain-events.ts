import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { dispatchPending } from '@/modules/events'
// Importa el barrel para registrar todos los suscriptores al boot.
import '@/modules/events/subscribers'

async function main() {
  const result = await dispatchPending()
  logger.info({ result }, 'domain events tick')
}

main()
  .catch((err) => {
    logger.error({ err }, 'process-domain-events failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
