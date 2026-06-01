/**
 * Stripe abstraction. Producción: SDK real cuando STRIPE_SECRET_KEY exista.
 * Dev/test/CI: Fake in-memory + verificación de firma simulada.
 */
import { createHmac } from 'node:crypto'

export interface StripeCheckoutSessionInput {
  orderId: string
  amountCents: number
  currency: string
  customerEmail?: string
  idempotencyKey: string
  successUrl: string
  cancelUrl: string
}

export interface StripeCheckoutSession {
  id: string
  url: string
  paymentIntentId: string
}

export interface StripeWebhookEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

export interface StripeClient {
  createCheckoutSession(input: StripeCheckoutSessionInput): Promise<StripeCheckoutSession>
  refund(paymentIntentId: string, idempotencyKey: string): Promise<{ id: string }>
  verifyWebhook(rawBody: string, signature: string): StripeWebhookEvent | null
}

class FakeStripe implements StripeClient {
  private sessions = new Map<
    string,
    StripeCheckoutSession & { input: StripeCheckoutSessionInput }
  >()
  private idempotency = new Map<string, string>()
  private signingSecret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_fake'

  async createCheckoutSession(input: StripeCheckoutSessionInput): Promise<StripeCheckoutSession> {
    // Idempotencia: misma key → mismo session id.
    const cached = this.idempotency.get(input.idempotencyKey)
    if (cached) {
      const s = this.sessions.get(cached)
      if (s) return s
    }
    const id = `cs_${Math.random().toString(36).slice(2, 10)}`
    const session: StripeCheckoutSession & { input: StripeCheckoutSessionInput } = {
      id,
      url: `https://stripe.fake/checkout/${id}`,
      paymentIntentId: `pi_${Math.random().toString(36).slice(2, 10)}`,
      input,
    }
    this.sessions.set(id, session)
    this.idempotency.set(input.idempotencyKey, id)
    return session
  }

  private refundsByKey = new Map<string, string>()

  async refund(_paymentIntentId: string, idempotencyKey: string): Promise<{ id: string }> {
    // Idempotente: misma key → mismo refund id (espejo de la API real).
    const cached = this.refundsByKey.get(idempotencyKey)
    if (cached) return { id: cached }
    const id = `re_${createHmac('sha256', this.signingSecret)
      .update(idempotencyKey)
      .digest('hex')
      .slice(0, 12)}`
    this.refundsByKey.set(idempotencyKey, id)
    return { id }
  }

  verifyWebhook(rawBody: string, signature: string): StripeWebhookEvent | null {
    const expected = createHmac('sha256', this.signingSecret).update(rawBody).digest('hex')
    if (expected !== signature) return null
    try {
      return JSON.parse(rawBody) as StripeWebhookEvent
    } catch {
      return null
    }
  }

  // Helpers solo para tests:
  _signPayload(event: StripeWebhookEvent): { body: string; signature: string } {
    const body = JSON.stringify(event)
    const signature = createHmac('sha256', this.signingSecret).update(body).digest('hex')
    return { body, signature }
  }

  _getSession(id: string) {
    return this.sessions.get(id)
  }

  _reset() {
    this.sessions.clear()
    this.idempotency.clear()
    this.refundsByKey.clear()
  }
}

const fakeSingleton = new FakeStripe()

export function getStripeClient(): StripeClient {
  // Cuando exista process.env.STRIPE_SECRET_KEY, instanciar SDK real.
  return fakeSingleton
}

export function _getFakeStripe(): FakeStripe {
  return fakeSingleton
}

export function _resetStripe(): void {
  fakeSingleton._reset()
}
