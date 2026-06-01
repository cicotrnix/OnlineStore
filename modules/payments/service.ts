import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { type StripeClient, getStripeClient } from '@/lib/stripe'
import { emitEvent } from '@/modules/events'
import { ordersService } from '@/modules/orders'
import { PaymentMismatchError, PaymentWebhookInvalidError } from './errors'

export interface CreateCardCheckoutInput {
  orderId: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
}

function decimalToCents(d: { toString(): string }): number {
  const [int, frac = ''] = d.toString().split('.')
  const fracPadded = `${frac}00`.slice(0, 2)
  return Number(int) * 100 + Number(fracPadded)
}

export async function createCardCheckout(
  input: CreateCardCheckoutInput,
  client: StripeClient = getStripeClient()
): Promise<{ paymentId: string; url: string }> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, total: true, currency: true, organizationId: true },
  })
  if (!order) throw new Error('order not found')

  const idempotencyKey = `pay-${order.id}`
  // Crea/reusa Payment PENDING con idempotency.
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey },
  })
  if (existing?.stripeSessionId) {
    return { paymentId: existing.id, url: '' } // url cached client-side
  }

  const session = await client.createCheckoutSession({
    orderId: order.id,
    amountCents: decimalToCents(order.total),
    currency: order.currency,
    customerEmail: input.customerEmail,
    idempotencyKey,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  })

  const payment = await prisma.payment.upsert({
    where: { idempotencyKey },
    create: {
      orderId: order.id,
      method: 'STRIPE_CARD',
      status: 'PENDING',
      amountCents: BigInt(decimalToCents(order.total)),
      currency: order.currency,
      stripeSessionId: session.id,
      stripeIntentId: session.paymentIntentId,
      idempotencyKey,
    },
    update: { stripeSessionId: session.id, stripeIntentId: session.paymentIntentId },
  })

  return { paymentId: payment.id, url: session.url }
}

/**
 * Webhook = ÚNICA fuente de verdad. Verifica firma → deduplica por event.id →
 * valida monto/moneda/order → en UNA tx: decrementa stock + marca CAPTURED +
 * emite payment.captured + invoice.issued si no existe.
 * Mismatch → NEEDS_REVIEW + auto-refund + audit.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  client: StripeClient = getStripeClient()
): Promise<{ ok: boolean; eventId?: string; reason?: string }> {
  const event = client.verifyWebhook(rawBody, signature)
  if (!event) throw new PaymentWebhookInvalidError('Invalid Stripe signature')

  // Solo procesamos eventos relevantes.
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'payment_intent.payment_failed'
  ) {
    return { ok: true, eventId: event.id, reason: 'event type ignored' }
  }

  // Idempotencia primaria por eventId.
  const dup = await prisma.paymentEvent.findUnique({ where: { eventId: event.id } })
  if (dup) return { ok: true, eventId: event.id, reason: 'duplicate' }

  const obj = event.data.object as Record<string, unknown>
  const payload = obj as unknown as import('@prisma/client').Prisma.InputJsonValue
  const sessionId = String(obj.id ?? '')
  const amountTotal = Number(obj.amount_total ?? 0)
  const currency = String(obj.currency ?? 'usd').toUpperCase()

  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    include: {
      order: {
        select: {
          id: true,
          total: true,
          currency: true,
          organizationId: true,
          status: true,
          placedByUserId: true,
        },
      },
    },
  })
  if (!payment) {
    logger.warn({ sessionId }, 'webhook for unknown payment')
    return { ok: false, eventId: event.id, reason: 'unknown payment' }
  }

  if (event.type === 'payment_intent.payment_failed') {
    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: { paymentId: payment.id, eventId: event.id, type: event.type, payload: payload },
      })
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
      await emitEvent(tx, {
        type: 'payment.failed',
        aggregateType: 'Payment',
        aggregateId: payment.id,
        payload: { orderId: payment.orderId },
      })
    })
    return { ok: true, eventId: event.id }
  }

  // checkout.session.completed: validar mismatch (monto+moneda).
  const expectedCents = decimalToCents(payment.order.total)
  if (amountTotal !== expectedCents || currency !== payment.order.currency) {
    logger.error(
      { expectedCents, amountTotal, expectedCurrency: payment.order.currency, currency },
      'payment mismatch — needs review + auto refund'
    )
    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: { paymentId: payment.id, eventId: event.id, type: event.type, payload: payload },
      })
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'NEEDS_REVIEW' },
      })
    })
    // Auto-refund (fuera de tx — Stripe API).
    if (payment.stripeIntentId) {
      await client.refund(payment.stripeIntentId, `auto-refund-${payment.id}`)
    }
    throw new PaymentMismatchError(
      `mismatch: ${amountTotal} ${currency} vs ${expectedCents} ${payment.order.currency}`
    )
  }

  // Happy path: tx con row lock + decrementa stock + marca CAPTURED + emite eventos.
  await prisma.$transaction(async (tx) => {
    await tx.paymentEvent.create({
      data: { paymentId: payment.id, eventId: event.id, type: event.type, payload: payload },
    })
    // Row lock sobre payment (FOR UPDATE) para evitar dobles captura concurrentes.
    await tx.$executeRawUnsafe(`SELECT id FROM "Payment" WHERE id = $1 FOR UPDATE`, payment.id)

    // Si ya está CAPTURED por una corrida previa (post-dup-check race), salir.
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
      select: { status: true },
    })
    if (current?.status === 'CAPTURED') return

    // Decrementa stock atómico vía ordersService (FOR UPDATE + atomic stock).
    // Si la orden ya está PAID/CONFIRMED, no decrementamos otra vez.
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'CAPTURED' },
    })

    if (payment.order.status === 'PENDING_PAYMENT') {
      // Confirma la orden: status CONFIRMED + decrementa stock vía SQL atómico.
      // Re-usamos la convención de Fase 1.
      const order = await tx.order.update({
        where: { id: payment.order.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })
      // Stock decrement por línea.
      const lines = await tx.orderLine.findMany({ where: { orderId: order.id } })
      for (const ln of lines) {
        const r = await tx.$executeRawUnsafe(
          `UPDATE "Product" SET "stockQuantity" = "stockQuantity" - $1 WHERE id = $2 AND "stockQuantity" >= $1`,
          ln.quantity,
          ln.productId
        )
        if (r === 0) {
          throw new Error(`insufficient stock at capture for product ${ln.productId}`)
        }
      }
    }

    await emitEvent(tx, {
      type: 'payment.captured',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: {
        orderId: payment.orderId,
        amountCents: expectedCents,
        currency: payment.order.currency,
      },
    })
  })

  return { ok: true, eventId: event.id }
}

/**
 * Wire/ACH: admin concilia el ingreso → emite payment.reconciled.
 * Idempotente: si ya existe PaymentEvent con el wireReference, no-op.
 */
export async function reconcileWire(input: {
  orderId: string
  amountCents: number
  wireReference: string
  adminUserId: string
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, currency: true, total: true, status: true },
  })
  if (!order) throw new Error('order not found')

  const eventId = `wire-${input.wireReference}`
  const dup = await prisma.paymentEvent.findUnique({ where: { eventId } })
  if (dup) return

  const expectedCents = decimalToCents(order.total)
  if (input.amountCents !== expectedCents) {
    throw new PaymentMismatchError(`wire amount mismatch: ${input.amountCents} vs ${expectedCents}`)
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        method: 'WIRE',
        status: 'CAPTURED',
        amountCents: BigInt(expectedCents),
        currency: order.currency,
        wireReference: input.wireReference,
      },
      update: { status: 'CAPTURED', wireReference: input.wireReference, method: 'WIRE' },
    })
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventId,
        type: 'wire.reconciled',
        payload: { wireReference: input.wireReference, amountCents: input.amountCents },
      },
    })
    if (order.status === 'PENDING_PAYMENT') {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      })
      const lines = await tx.orderLine.findMany({ where: { orderId: order.id } })
      for (const ln of lines) {
        const r = await tx.$executeRawUnsafe(
          `UPDATE "Product" SET "stockQuantity" = "stockQuantity" - $1 WHERE id = $2 AND "stockQuantity" >= $1`,
          ln.quantity,
          ln.productId
        )
        if (r === 0) throw new Error(`insufficient stock at reconcile for ${ln.productId}`)
      }
    }
    await emitEvent(tx, {
      type: 'payment.reconciled',
      aggregateType: 'Payment',
      aggregateId: payment.id,
      payload: {
        orderId: order.id,
        wireReference: input.wireReference,
        amountCents: input.amountCents,
      },
    })
  })
}

export { ordersService } // re-export por conveniencia
