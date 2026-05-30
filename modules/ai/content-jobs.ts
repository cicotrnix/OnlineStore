import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'

const BATCH_SIZE = 10
const MAX_ATTEMPTS = 5

export interface ContentJob {
  id: string
  productId: string
  locale: string
}

export interface ProcessJobsResult {
  processed: number
  failed: number
}

/** Idempotente: si ya hay un job PENDING para (productId, locale), no encola otro. */
export async function enqueueContentJob(productId: string, locale: string): Promise<void> {
  const existing = await prisma.aiContentJob.findFirst({
    where: { productId, locale, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) return
  await prisma.aiContentJob.create({ data: { productId, locale, status: 'PENDING' } })
}

/**
 * Procesa hasta BATCH_SIZE jobs PENDING usando FOR UPDATE SKIP LOCKED (mismo
 * patrón que modules/search/index-queue.ts). El handler corre la generación
 * real — se inyecta desde el Corte 1.
 */
export async function processContentJobs(
  handler: (job: ContentJob) => Promise<void>
): Promise<ProcessJobsResult> {
  const result: ProcessJobsResult = { processed: 0, failed: 0 }

  const batch = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`
      SELECT id FROM "AiContentJob"
      WHERE status = 'PENDING'
      ORDER BY "enqueuedAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `)
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    await tx.aiContentJob.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PROCESSING' },
    })
    return tx.aiContentJob.findMany({ where: { id: { in: ids } } })
  })

  for (const job of batch) {
    try {
      await handler({ id: job.id, productId: job.productId, locale: job.locale })
      await prisma.aiContentJob.update({
        where: { id: job.id },
        data: { status: 'DONE', processedAt: new Date(), lastError: null },
      })
      result.processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const attempts = job.attempts + 1
      const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'
      await prisma.aiContentJob.update({
        where: { id: job.id },
        data: { status, attempts, lastError: message, processedAt: new Date() },
      })
      result.failed++
      logger.error(
        { jobId: job.id, productId: job.productId, attempt: attempts, err: message },
        'ai content job error'
      )
    }
  }

  return result
}
