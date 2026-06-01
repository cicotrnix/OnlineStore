import { prisma } from '@/lib/db/client'
import { type StripeClient, getStripeClient } from '@/lib/stripe'
import { emitEvent } from '@/modules/events'
import { PaymentMismatchError } from './errors'
import { consumeSensitiveActionToken } from './step-up'

export interface RefundInput {
  paymentId: string
  byUserId: string
  /** token/otp del step-up (issueSensitiveActionToken) */
  token: string
  otp: string
  reason?: string
}

/**
 * Refund con step-up obligatorio. La API de Stripe es la única que ejecuta
 * el reembolso; nunca marcamos REFUNDED sin confirmación de webhook (en este
 * stub se marca optimista; en producción se procesa vía webhook real).
 */
export async function refundPayment(
  input: RefundInput,
  client: StripeClient = getStripeClient()
): Promise<void> {
  const allowed = await consumeSensitiveActionToken({
    token: input.token,
    otp: input.otp,
    userId: input.byUserId,
    action: 'payment.refund',
    subjectId: input.paymentId,
  })
  if (!allowed) throw new Error('STEP_UP_FAILED')

  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } })
  if (!payment) throw new Error('payment not found')
  if (payment.status !== 'CAPTURED') {
    throw new PaymentMismatchError(`refund only allowed on CAPTURED, got ${payment.status}`)
  }
  if (payment.stripeIntentId) {
    await client.refund(payment.stripeIntentId, `refund-${payment.id}-${Date.now()}`)
  }
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
    await emitEvent(tx, {
      type: 'payment.refunded',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: { orderId: payment.orderId, reason: input.reason ?? null },
    })
  })
}
