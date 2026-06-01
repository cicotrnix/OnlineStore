import { prisma } from '@/lib/db/client'
import { CHART_OF_ACCOUNTS } from './chart'

/**
 * Siembra el plan de cuentas. Idempotente: upsert por code.
 */
export async function seedChartOfAccounts(): Promise<void> {
  for (const a of CHART_OF_ACCOUNTS) {
    await prisma.ledgerAccount.upsert({
      where: { code: a.code },
      create: a,
      update: {},
    })
  }
}
