import { prisma } from '@/lib/db/client'

/**
 * Limpia tablas del ledger entre tests. Idempotente. cleanDb principal NO toca
 * el ledger porque algunos tests siembran chart once-per-file.
 */
export async function cleanLedger(): Promise<void> {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.accountingPeriod.deleteMany()
}
