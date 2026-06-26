import { prisma } from '@/lib/db/client'
import { sendEmail } from '@/lib/email/resend'
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/i18n'
import { logger } from '@/lib/observability/logger'
import type { Notification, NotificationType } from '@prisma/client'
import { type ReceiptData, renderEmailFor } from './email'

export interface DispatchInput {
  userIds: string[]
  type: NotificationType
  title: string
  body: string
  link?: string
  subjectType?: string
  subjectId?: string
}

export async function dispatch(input: DispatchInput): Promise<void> {
  if (input.userIds.length === 0) return

  const created = await prisma.notification.createManyAndReturn({
    data: input.userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
    })),
  })

  await Promise.all(
    created.map(async (notif) => {
      try {
        await sendNotificationEmail(notif)
      } catch (err) {
        logger.error({ err, notificationId: notif.id }, 'notification email send failed')
      }
    })
  )
}

/**
 * Datos del recibo para el email consolidado PAYMENT_CAPTURED. Se arman en el
 * render (la Notification solo guarda title/body/link). subjectId = payment.id.
 */
async function receiptVarsFor(notif: Notification): Promise<ReceiptData | undefined> {
  if (notif.type !== 'PAYMENT_CAPTURED' || !notif.subjectId) return undefined
  const payment = await prisma.payment.findUnique({
    where: { id: notif.subjectId },
    select: { method: true, orderId: true },
  })
  if (!payment) return undefined
  const invoice = await prisma.invoice.findUnique({
    where: { orderId: payment.orderId },
    select: { number: true, amount: true, paidAt: true },
  })
  if (!invoice) return undefined
  return {
    invoiceNumber: invoice.number,
    dateFormatted: (invoice.paidAt ?? new Date()).toISOString().slice(0, 10),
    method: payment.method === 'STRIPE_CARD' ? 'Tarjeta' : 'Transferencia',
    totalFormatted: `$${invoice.amount.toFixed(2)}`,
  }
}

async function sendNotificationEmail(notif: Notification): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: notif.userId } })
  if (!user?.email) return

  try {
    const locale =
      user.preferredLocale && isSupportedLocale(user.preferredLocale)
        ? user.preferredLocale
        : DEFAULT_LOCALE
    const receipt = await receiptVarsFor(notif)
    const rendered = await renderEmailFor(
      notif.type,
      {
        title: notif.title,
        body: notif.body,
        link: notif.link,
        userName: user.name ?? 'there',
        receipt,
      },
      locale
    )
    await sendEmail({ to: user.email, subject: notif.title, html: rendered })
    await prisma.notification.update({
      where: { id: notif.id },
      data: { emailSentAt: new Date(), emailFailedReason: null },
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    await prisma.notification.update({
      where: { id: notif.id },
      data: {
        emailFailedReason: reason,
        emailRetryCount: { increment: 1 },
      },
    })
    throw err
  }
}

export async function listForUser(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  return prisma.notification.findMany({
    where: { userId, ...(options.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 50,
  })
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

export async function markAsRead(userId: string, ids: string[]): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}

const MAX_RETRY = 5
const RETRY_DELAY_MS = 60 * 1000

export async function retryFailedEmails(): Promise<{ attempted: number; succeeded: number }> {
  const candidates = await prisma.notification.findMany({
    where: {
      emailSentAt: null,
      emailRetryCount: { lt: MAX_RETRY },
      createdAt: { lt: new Date(Date.now() - RETRY_DELAY_MS) },
    },
    take: 50,
  })

  let succeeded = 0
  for (const notif of candidates) {
    try {
      await sendNotificationEmail(notif)
      succeeded++
    } catch {
      // retryCount incremented inside sendNotificationEmail
    }
  }
  return { attempted: candidates.length, succeeded }
}
