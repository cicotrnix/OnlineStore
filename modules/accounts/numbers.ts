import type { Prisma } from '@prisma/client'

/**
 * Generates a unique invoice number IN-YYYY-NNNNNN using per-year Postgres
 * sequence (created in migration phase2_sql_custom). Uses advisory lock to
 * serialize the SELECT nextval call within the transaction.
 */
export async function generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const seqName = `invoice_seq_${year}`
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('${seqName}'))`)
  await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`)
  const rows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('${seqName}') AS nextval`
  )
  const n = Number(rows[0]?.nextval ?? 0)
  return `IN-${year}-${n.toString().padStart(6, '0')}`
}
