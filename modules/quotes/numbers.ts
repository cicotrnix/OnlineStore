import type { Prisma } from '@prisma/client'

export async function generateQuoteNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const seqName = `quote_seq_${year}`
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('${seqName}'))`)
  await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`)
  const rows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('${seqName}') AS nextval`
  )
  const n = Number(rows[0]?.nextval ?? 0)
  return `QU-${year}-${n.toString().padStart(6, '0')}`
}
