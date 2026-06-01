import { prisma } from '@/lib/db/client'

/**
 * KPIs internos derivados del ledger + órdenes. No usa API externa.
 * Devuelve montos en centavos (BIGINT) cuando aplica.
 */
export interface InternalKpis {
  ordersConfirmed: number
  revenueCents: bigint
  receivableCents: bigint
  topProducts: Array<{ productId: string; sku: string; name: string; units: number }>
}

export async function getInternalKpis(
  opts: { from?: Date; to?: Date } = {}
): Promise<InternalKpis> {
  const confirmedAt: { gte?: Date; lte?: Date } | undefined =
    opts.from || opts.to ? { gte: opts.from, lte: opts.to } : undefined
  const where = {
    status: 'CONFIRMED' as const,
    ...(confirmedAt ? { confirmedAt } : {}),
  }

  const ordersConfirmed = await prisma.order.count({ where })

  // Revenue: suma de payments CAPTURED en el rango.
  const payments = await prisma.payment.findMany({
    where: {
      status: 'CAPTURED',
      ...(opts.from || opts.to ? { createdAt: { gte: opts.from, lte: opts.to } } : {}),
    },
    select: { amountCents: true },
  })
  const revenueCents = payments.reduce((s, p) => s + p.amountCents, 0n)

  // CxC: balance débito CxC (cuenta 1100) hoy.
  const arLines = await prisma.journalLine.findMany({
    where: { account: { code: '1100' } },
    select: { debitCents: true, creditCents: true },
  })
  const receivableCents = arLines.reduce((s, l) => s + l.debitCents - l.creditCents, 0n)

  // Top productos por unidades en órdenes CONFIRMED del rango.
  const lines = await prisma.orderLine.groupBy({
    by: ['productId'],
    where: { order: where },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  })
  const productIds = lines.map((l) => l.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, name: true },
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  const topProducts = lines.map((l) => {
    const p = byId.get(l.productId)
    return {
      productId: l.productId,
      sku: p?.sku ?? '',
      name: p?.name ?? '',
      units: l._sum?.quantity ?? 0,
    }
  })

  return { ordersConfirmed, revenueCents, receivableCents, topProducts }
}
