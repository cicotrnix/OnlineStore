import { prisma } from '@/lib/db/client'
import { isSupportedLocale } from '@/lib/i18n'
import { logger } from '@/lib/observability/logger'
import { processContentJobs } from '@/modules/ai'
import { generateContentForProduct } from '@/modules/ai/content'

async function main() {
  const result = await processContentJobs(async (job) => {
    if (!isSupportedLocale(job.locale)) {
      throw new Error(`Unsupported locale ${job.locale}`)
    }
    await generateContentForProduct({ productId: job.productId, locale: job.locale })
  })
  logger.info({ result }, 'ai content jobs tick')
}

main()
  .catch((err) => {
    logger.error({ err }, 'process-ai-content-jobs failed')
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
