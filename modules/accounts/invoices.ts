import { prisma } from '@/lib/db/client'
import { dispatch } from '@/modules/notifications'
import type { Invoice, PaymentTerms, Prisma } from '@prisma/client'
import { generateInvoiceNumber } from './numbers'

const DAYS_BY_TERMS: Record<PaymentTerms, number> = {
  PREPAID: 0,
  NET_15: 15,
  NET_30: 30,
  NET_60: 60,
}

export async function createInvoiceFromOrder(
  orderId: string,
  tx?: Prisma.TransactionClient
): Promise<Invoice> {
  const exec = async (t: Prisma.TransactionClient): Promise<Invoice> => {
    const order = await t.order.findUniqueOrThrow({ where: { id: orderId } })
    const org = await t.organization.findUniqueOrThrow({
      where: { id: order.organizationId },
    })

    const days = DAYS_BY_TERMS[org.paymentTerms] ?? 30
    const baseDate = order.confirmedAt ?? new Date()
    const dueDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)
    const number = await generateInvoiceNumber(t)

    const invoice = await t.invoice.create({
      data: {
        number,
        organizationId: order.organizationId,
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        dueDate,
        status: 'PENDING',
      },
    })

    await t.organization.update({
      where: { id: org.id },
      data: { creditUsed: { increment: order.total } },
    })

    const orgMembers = await t.organizationMember.findMany({
      where: { organizationId: org.id },
      select: { userId: true },
    })
    // PREPAID (days===0, p.ej. tarjeta Stripe) no tiene fecha de vencimiento →
    // el email "vence en X días" no aplica. Solo se manda con términos a crédito.
    if (days > 0 && orgMembers.length > 0) {
      await dispatch({
        userIds: orgMembers.map((m) => m.userId),
        type: 'INVOICE_DUE_SOON',
        title: `Factura ${invoice.number} emitida — vence ${invoice.dueDate.toISOString().slice(0, 10)}`,
        body: `Se generó una factura por $${invoice.amount.toFixed(2)} con vencimiento en ${days} días.`,
        link: `/invoices/${invoice.id}`,
        subjectType: 'INVOICE',
        subjectId: invoice.id,
      })
    }

    return invoice
  }

  return tx ? exec(tx) : prisma.$transaction(exec)
}

export async function settleInvoiceForPaidOrder(
  tx: Prisma.TransactionClient,
  input: { orderId: string; paidById: string; reference: string; notify?: boolean }
): Promise<void> {
  const invoice = await tx.invoice.findUnique({ where: { orderId: input.orderId } })
  if (!invoice) return // no invoice yet — no-op
  if (invoice.status === 'PAID') return // idempotent: already settled

  await tx.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paidById: input.paidById,
      paidNote: input.reference,
    },
  })

  await tx.organization.update({
    where: { id: invoice.organizationId },
    data: { creditUsed: { decrement: invoice.amount } },
  })

  const members = await tx.organizationMember.findMany({
    where: { organizationId: invoice.organizationId },
    select: { userId: true },
  })
  // notify=false: la captura con tarjeta manda 1 email consolidado (PAYMENT_CAPTURED),
  // así que se suprime el INVOICE_PAID. Wire (default) lo mantiene.
  if (input.notify !== false && members.length > 0) {
    // Notification dispatch is NOT part of the transaction; if the outer tx rolls back, the notification has already fired. Matches markPaid's behavior.
    await dispatch({
      userIds: members.map((m) => m.userId),
      type: 'INVOICE_PAID',
      title: `Factura ${invoice.number} marcada como pagada`,
      body: `Tu factura por $${invoice.amount.toFixed(2)} fue confirmada como pagada.`,
      link: `/invoices/${invoice.id}`,
      subjectType: 'INVOICE',
      subjectId: invoice.id,
    })
  }
}

export interface MarkPaidInput {
  invoiceId: string
  paidById: string
  paidNote: string
  paidAt?: Date
}

export async function markPaid(input: MarkPaidInput): Promise<Invoice> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.invoice.updateMany({
      where: { id: input.invoiceId, status: { in: ['PENDING', 'OVERDUE'] } },
      data: {
        status: 'PAID',
        paidAt: input.paidAt ?? new Date(),
        paidById: input.paidById,
        paidNote: input.paidNote,
      },
    })

    if (result.count === 0) {
      const existing = await tx.invoice.findUnique({ where: { id: input.invoiceId } })
      if (!existing) throw new Error(`Invoice not found: ${input.invoiceId}`)
      throw new Error(
        `Invoice ${input.invoiceId} cannot be marked paid (status: ${existing.status})`
      )
    }

    const updated = await tx.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } })

    await tx.organization.update({
      where: { id: updated.organizationId },
      data: { creditUsed: { decrement: updated.amount } },
    })

    const orgMembers = await tx.organizationMember.findMany({
      where: { organizationId: updated.organizationId },
      select: { userId: true },
    })
    if (orgMembers.length > 0) {
      // Notification dispatch is NOT part of the transaction; if the outer tx rolls back, the notification has already fired. Matches markPaid's behavior.
      await dispatch({
        userIds: orgMembers.map((m) => m.userId),
        type: 'INVOICE_PAID',
        title: `Factura ${updated.number} marcada como pagada`,
        body: `Tu factura por $${updated.amount.toFixed(2)} fue confirmada como pagada.`,
        link: `/invoices/${updated.id}`,
        subjectType: 'INVOICE',
        subjectId: updated.id,
      })
    }

    return updated
  })
}
