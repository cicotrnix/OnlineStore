import { logger } from '@/lib/observability/logger'
import {
  PaymentMismatchError,
  PaymentWebhookInvalidError,
  handleStripeWebhook,
} from '@/modules/payments'
import { NextResponse } from 'next/server'

// Necesitamos body crudo + SDK Stripe → Node runtime obligatorio.
export const runtime = 'nodejs'
// Forzar dynamic — Next no debe cachear la ruta.
export const dynamic = 'force-dynamic'

/**
 * Webhook Stripe — fuente de verdad PSDD.
 *
 * - Public endpoint: la seguridad es la firma HMAC (verificada en handler).
 * - Body crudo (req.text()) — req.json() corrompería el HMAC.
 * - 400 si firma inválida → Stripe no reintenta (correcto).
 * - 200 si mismatch (NEEDS_REVIEW + auto-refund ya dispararon) → Stripe no reintenta.
 * - 200 success.
 * - 500 error inesperado → Stripe reintenta con backoff.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  try {
    const r = await handleStripeWebhook(rawBody, signature)
    return NextResponse.json(r, { status: 200 })
  } catch (err) {
    if (err instanceof PaymentWebhookInvalidError) {
      logger.warn({ err: err.message }, 'stripe webhook: invalid signature')
      return NextResponse.json({ ok: false, reason: 'invalid signature' }, { status: 400 })
    }
    if (err instanceof PaymentMismatchError) {
      // El refund + NEEDS_REVIEW ya fueron escritos por el handler. Responder 200
      // para que Stripe no reintente — el caso está cerrado del lado app.
      logger.warn({ err: err.message }, 'stripe webhook: mismatch handled')
      return NextResponse.json({ ok: true, reason: 'mismatch handled' }, { status: 200 })
    }
    logger.error(
      { err: err instanceof Error ? err.message : err },
      'stripe webhook: unexpected error'
    )
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
