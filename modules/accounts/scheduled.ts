import { prisma } from '@/lib/db/client'
import { dispatch } from '@/modules/notifications'

export async function markInvoicesOverdue(): Promise<{ updated: number }> {
  const now = new Date()
  const toMark = await prisma.invoice.findMany({
    where: { status: 'PENDING', dueDate: { lt: now } },
    select: { id: true, number: true, organizationId: true, amount: true },
  })
  if (toMark.length === 0) return { updated: 0 }

  await prisma.invoice.updateMany({
    where: { id: { in: toMark.map((i) => i.id) } },
    data: { status: 'OVERDUE' },
  })

  for (const inv of toMark) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: inv.organizationId },
      select: { userId: true },
    })
    if (members.length > 0) {
      await dispatch({
        userIds: members.map((m) => m.userId),
        type: 'INVOICE_OVERDUE',
        title: `Factura ${inv.number} vencida`,
        body: `La factura por $${inv.amount.toFixed(2)} está vencida. Por favor coordina el pago.`,
        link: `/invoices/${inv.id}`,
        subjectType: 'INVOICE',
        subjectId: inv.id,
      })
    }
  }

  return { updated: toMark.length }
}

export async function sendInvoiceDueSoon(): Promise<{ notified: number }> {
  const windowStart = new Date(Date.now() + 2 * 86400000)
  const windowEnd = new Date(Date.now() + 4 * 86400000)

  const candidates = await prisma.invoice.findMany({
    where: { status: 'PENDING', dueDate: { gte: windowStart, lte: windowEnd } },
    select: {
      id: true,
      number: true,
      organizationId: true,
      amount: true,
      dueDate: true,
    },
  })

  let notified = 0
  for (const inv of candidates) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: inv.organizationId },
      select: { userId: true },
    })
    if (members.length === 0) continue
    await dispatch({
      userIds: members.map((m) => m.userId),
      type: 'INVOICE_DUE_SOON',
      title: `Factura ${inv.number} vence en ~3 días`,
      body: `Recordatorio: factura por $${inv.amount.toFixed(2)} vence el ${inv.dueDate.toISOString().slice(0, 10)}.`,
      link: `/invoices/${inv.id}`,
      subjectType: 'INVOICE',
      subjectId: inv.id,
    })
    notified += members.length
  }
  return { notified }
}
