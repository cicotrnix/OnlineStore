import { prisma } from '@/lib/db/client'
import { dispatch } from '@/modules/notifications'

export async function markExpiredQuotes(): Promise<{ updated: number }> {
  const candidates = await prisma.quote.findMany({
    where: { status: 'QUOTED', validUntil: { lt: new Date() } },
    select: { id: true, number: true, requestedById: true },
  })

  if (candidates.length === 0) return { updated: 0 }

  await prisma.quote.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { status: 'EXPIRED' },
  })

  await prisma.quoteAuditLog.createMany({
    data: candidates.map((c) => ({
      quoteId: c.id,
      action: 'expired',
      payload: { auto: true },
    })),
  })

  for (const c of candidates) {
    await dispatch({
      userIds: [c.requestedById],
      type: 'QUOTE_EXPIRING',
      title: `Cotización ${c.number} venció`,
      body: 'La cotización pasó su fecha de validez. Puedes solicitar una nueva.',
      link: `/quotes/${c.id}`,
      subjectType: 'QUOTE',
      subjectId: c.id,
    })
  }

  return { updated: candidates.length }
}

export async function sendExpiringSoon(): Promise<{ notified: number }> {
  const windowStart = new Date(Date.now() + 2 * 86400000)
  const windowEnd = new Date(Date.now() + 4 * 86400000)

  const candidates = await prisma.quote.findMany({
    where: { status: 'QUOTED', validUntil: { gte: windowStart, lte: windowEnd } },
    select: { id: true, number: true, requestedById: true, validUntil: true },
  })

  for (const c of candidates) {
    await dispatch({
      userIds: [c.requestedById],
      type: 'QUOTE_EXPIRING',
      title: `Cotización ${c.number} vence en ~3 días`,
      body: `Tu cotización vence el ${c.validUntil?.toISOString().slice(0, 10)}. Acéptala antes para asegurar los precios.`,
      link: `/quotes/${c.id}`,
      subjectType: 'QUOTE',
      subjectId: c.id,
    })
  }

  return { notified: candidates.length }
}

export async function cleanupStaleDrafts(daysOld = 30): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - daysOld * 86400000)
  const result = await prisma.quote.deleteMany({
    where: { status: 'DRAFT', updatedAt: { lt: cutoff } },
  })
  return { deleted: result.count }
}
