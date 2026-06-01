import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'

const EVENT_TTL_DAYS = 180
const DELIVERY_TTL_DAYS = 90

async function main() {
  const eventCutoff = new Date(Date.now() - EVENT_TTL_DAYS * 86_400_000)
  const deliveryCutoff = new Date(Date.now() - DELIVERY_TTL_DAYS * 86_400_000)

  const deliveries = await prisma.eventDelivery.deleteMany({
    where: { status: { in: ['DONE', 'FAILED'] }, processedAt: { lt: deliveryCutoff } },
  })
  const events = await prisma.domainEvent.deleteMany({
    where: { status: 'DONE', createdAt: { lt: eventCutoff } },
  })
  logger.info({ deliveries: deliveries.count, events: events.count }, 'domain events cleanup')
}

main()
  .catch((err) => {
    logger.error({ err }, 'cleanup-domain-events failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
