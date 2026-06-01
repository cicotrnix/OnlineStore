import { prisma } from '@/lib/db/client'

export interface TrialBalanceRow {
  accountCode: string
  accountName: string
  debitCents: bigint
  creditCents: bigint
  balanceCents: bigint // debit - credit (positive = debit balance)
}

/**
 * Balance de comprobación: suma debits y credits por cuenta.
 * Opcionalmente acotado por rango de fechas.
 */
export async function trialBalance(opts: { from?: Date; to?: Date } = {}): Promise<{
  rows: TrialBalanceRow[]
  totalDebits: bigint
  totalCredits: bigint
}> {
  const where: { entry?: { occurredAt?: { gte?: Date; lte?: Date } } } = {}
  if (opts.from || opts.to) {
    where.entry = { occurredAt: {} }
    if (opts.from) where.entry.occurredAt!.gte = opts.from
    if (opts.to) where.entry.occurredAt!.lte = opts.to
  }
  const lines = await prisma.journalLine.findMany({
    where,
    include: { account: { select: { code: true, name: true } } },
  })
  const map = new Map<string, TrialBalanceRow>()
  let totalDebits = 0n
  let totalCredits = 0n
  for (const ln of lines) {
    const key = ln.account.code
    if (!map.has(key)) {
      map.set(key, {
        accountCode: ln.account.code,
        accountName: ln.account.name,
        debitCents: 0n,
        creditCents: 0n,
        balanceCents: 0n,
      })
    }
    const row = map.get(key)!
    row.debitCents += ln.debitCents
    row.creditCents += ln.creditCents
    totalDebits += ln.debitCents
    totalCredits += ln.creditCents
  }
  for (const row of map.values()) {
    row.balanceCents = row.debitCents - row.creditCents
  }
  const rows = [...map.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  return { rows, totalDebits, totalCredits }
}
