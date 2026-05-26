import { prisma } from '@/lib/db/client'

/**
 * Generates a unique order number in format ORD-YYYY-NNNNNN using a per-year
 * Postgres sequence. The sequence is created lazily on first use, guarded by
 * pg_advisory_xact_lock to prevent races during creation. nextval itself is
 * already concurrency-safe.
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const seqName = `order_seq_${year}`

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('${seqName}'))`)
    await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`)
  })

  const rows = await prisma.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('${seqName}') AS nextval`
  )
  const n = Number(rows[0]?.nextval ?? 0)
  const padded = n.toString().padStart(6, '0')
  return `ORD-${year}-${padded}`
}
