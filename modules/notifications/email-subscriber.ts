import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import type { DomainEventRecord, DomainEventType, Subscriber } from '@/modules/events'
import type { NotificationType } from '@prisma/client'
import { dispatch } from './service'

/**
 * Mapeo evento de dominio → tipo de notificación + título/cuerpo. Si un evento
 * no debe disparar email (ej: payment.failed solo logs), retorna null.
 */
type MailMapper = (event: DomainEventRecord) => Promise<{
  type: NotificationType
  title: string
  body: string
  link?: string
  recipients: string[] // userIds
} | null>

async function recipientsForOrderAggregate(aggregateId: string): Promise<string[]> {
  const order = await prisma.order.findUnique({
    where: { id: aggregateId },
    select: { placedByUserId: true },
  })
  return order ? [order.placedByUserId] : []
}

async function recipientsForPayment(aggregateId: string): Promise<string[]> {
  const payment = await prisma.payment.findUnique({
    where: { id: aggregateId },
    select: { order: { select: { placedByUserId: true } } },
  })
  return payment?.order ? [payment.order.placedByUserId] : []
}

async function recipientsForShipment(aggregateId: string): Promise<string[]> {
  const sh = await prisma.shipment.findUnique({
    where: { id: aggregateId },
    select: { order: { select: { placedByUserId: true } } },
  })
  return sh?.order ? [sh.order.placedByUserId] : []
}

const MAPPERS: Partial<Record<DomainEventType, MailMapper>> = {
  'order.placed': async (e) => ({
    type: 'ORDER_PLACED',
    title: 'Orden recibida',
    body: `Recibimos tu orden ${String(e.payload.orderNumber ?? e.aggregateId)}.`,
    link: `/orders/${e.aggregateId}`,
    recipients: await recipientsForOrderAggregate(e.aggregateId),
  }),
  'payment.captured': async (e) => ({
    type: 'PAYMENT_CAPTURED',
    title: 'Pago capturado',
    body: 'Confirmamos el pago de tu orden.',
    link: `/orders/${String(e.payload.orderId ?? '')}`,
    recipients: await recipientsForPayment(e.aggregateId),
  }),
  'payment.reconciled': async (e) => ({
    type: 'PAYMENT_RECONCILED',
    title: 'Wire recibido',
    body: 'Tu transferencia fue conciliada.',
    link: `/orders/${String(e.payload.orderId ?? '')}`,
    recipients: await recipientsForPayment(e.aggregateId),
  }),
  'invoice.issued': async (e) => {
    const invoiceId = e.aggregateId
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { organization: { select: { members: { select: { userId: true } } } } },
    })
    const recipients = inv?.organization?.members.map((m) => m.userId) ?? []
    return {
      type: 'INVOICE_ISSUED' as const,
      title: 'Factura emitida',
      body: 'Recibí instrucciones para tu wire/ACH.',
      link: `/invoices/${invoiceId}`,
      recipients,
    }
  },
  'shipment.dispatched': async (e) => ({
    type: 'SHIPMENT_DISPATCHED',
    title: 'Tu pedido fue despachado',
    body: `Tracking: ${String(e.payload.trackingNumber ?? '')}`,
    link: `/orders/${String(e.payload.orderId ?? '')}`,
    recipients: await recipientsForShipment(e.aggregateId),
  }),
  'invoice.overdue': async (e) => {
    const invoiceId = e.aggregateId
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        number: true,
        amount: true,
        organization: { select: { members: { select: { userId: true } } } },
      },
    })
    if (!inv) return null
    return {
      type: 'INVOICE_OVERDUE' as const,
      title: `Factura ${inv.number} vencida`,
      body: `La factura por $${inv.amount.toFixed(2)} pasó su fecha de vencimiento.`,
      link: `/invoices/${invoiceId}`,
      recipients: inv.organization.members.map((m) => m.userId),
    }
  },
}

export const emailSubscriber: Subscriber = {
  name: 'email',
  handles: [
    'order.placed',
    'payment.captured',
    'payment.reconciled',
    'invoice.issued',
    'invoice.overdue',
    'shipment.dispatched',
  ],
  async handle(event: DomainEventRecord): Promise<void> {
    const mapper = MAPPERS[event.type]
    if (!mapper) return
    const mail = await mapper(event)
    if (!mail) return
    if (mail.recipients.length === 0) {
      logger.warn({ eventId: event.id, type: event.type }, 'email subscriber: no recipients')
      return
    }
    await dispatch({
      userIds: mail.recipients,
      type: mail.type,
      title: mail.title,
      body: mail.body,
      link: mail.link,
      subjectType: event.aggregateType,
      subjectId: event.aggregateId,
    })
  },
}
