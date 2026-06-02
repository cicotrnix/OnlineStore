import { prisma } from '@/lib/db/client'
import { type StripeClient, getStripeClient } from '@/lib/stripe'
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
 * Inicia un refund con step-up obligatorio. PSDD: nunca marcamos REFUNDED
 * sin confirmación de webhook. Esta función:
 *   1) verifica step-up,
 *   2) marca el Payment como REFUND_PENDING (no REFUNDED),
 *   3) llama a Stripe Refund API con idempotency key estable (sin Date.now),
 *
 * La confirmación de status REFUNDED + el evento `payment.refunded` ocurren
 * cuando handleStripeWebhook recibe `charge.refunded` de Stripe.
 */
export async function refundPayment(
  input: RefundInput,
  client: StripeClient = getStripeClient()
): Promise<{ refundId: string }> {
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
  if (payment.status === 'REFUND_PENDING' || payment.status === 'REFUNDED') {
    // Idempotente: ya inició/completó el refund.
    if (payment.stripeIntentId) {
      const r = await client.refund(payment.stripeIntentId, `refund-${payment.id}`)
      return { refundId: r.id }
    }
    return { refundId: '' }
  }
  if (payment.status !== 'CAPTURED') {
    throw new PaymentMismatchError(`refund only allowed on CAPTURED, got ${payment.status}`)
  }
  if (!payment.stripeIntentId) {
    throw new Error('payment has no stripe intent — manual refund required')
  }

  // Idempotency key estable (sin Date.now). Stripe garantiza misma respuesta
  // si la key se repite — soporta retries seguros del caller.
  const refund = await client.refund(payment.stripeIntentId, `refund-${payment.id}`)

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'REFUND_PENDING' },
  })

  return { refundId: refund.id }
}
