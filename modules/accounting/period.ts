import { prisma } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

/**
 * Devuelve (upsert) el período contable correspondiente a una fecha.
 * Si el período está CLOSED → throw — no se postea sobre períodos cerrados.
 */
export async function ensureOpenPeriod(
  occurredAt: Date,
  tx?: Prisma.TransactionClient
): Promise<{ id: string; year: number; month: number }> {
  const year = occurredAt.getUTCFullYear()
  const month = occurredAt.getUTCMonth() + 1
  const c = tx ?? prisma
  const existing = await c.accountingPeriod.findUnique({ where: { year_month: { year, month } } })
  if (existing) {
    if (existing.status === 'CLOSED') {
      throw new Error(`Accounting period ${year}-${month} is CLOSED — no postings allowed`)
    }
    return { id: existing.id, year: existing.year, month: existing.month }
  }
  const created = await c.accountingPeriod.create({ data: { year, month } })
  return { id: created.id, year: created.year, month: created.month }
}

/**
 * Cierra un período. Acción sensible (debería pasar step-up en el caller).
 */
export async function closePeriod({
  year,
  month,
  closedBy,
}: {
  year: number
  month: number
  closedBy: string
}): Promise<void> {
  await prisma.accountingPeriod.update({
    where: { year_month: { year, month } },
    data: { status: 'CLOSED', closedAt: new Date(), closedBy },
  })
}
