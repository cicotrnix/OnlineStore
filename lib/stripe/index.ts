/**
 * Stripe abstraction. Producción: SDK real cuando STRIPE_SECRET_KEY exista.
 * Dev/test/CI: Fake in-memory + verificación de firma simulada.
 *
 * Env vars:
 *   - STRIPE_SECRET_KEY → activa cliente real
 *   - STRIPE_WEBHOOK_SECRET → necesario en ambos modos (Fake usa 'whsec_fake'
 *     por default; real lo usa el SDK para Stripe.webhooks.constructEvent).
 *
 * PSDD (ADR 0027) preservado en ambos modos: webhook firmado = única fuente
 * de verdad; idempotencia por eventId; refund con key estable.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getStoreConfig } from '@/stores'
import Stripe from 'stripe'

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

// ─── Fake ─────────────────────────────────────────────────────────────────

class FakeStripe implements StripeClient {
  private sessions = new Map<
    string,
    StripeCheckoutSession & { input: StripeCheckoutSessionInput }
  >()
  private idempotency = new Map<string, string>()
  private signingSecret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_fake'

  async createCheckoutSession(input: StripeCheckoutSessionInput): Promise<StripeCheckoutSession> {
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
    // Comparación constant-time (Decisión 3 / ADR 0038). timingSafeEqual exige
    // buffers de igual longitud, así que primero descartamos por longitud.
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    try {
      return JSON.parse(rawBody) as StripeWebhookEvent
    } catch {
      return null
    }
  }

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

// ─── Real ─────────────────────────────────────────────────────────────────

/**
 * Adaptador real sobre el SDK de Stripe. Sin claves → no se instancia (selector
 * cae al Fake). Mismo contrato.
 */
class RealStripe implements StripeClient {
  private sdk: Stripe
  constructor(
    secretKey: string,
    private readonly webhookSecret: string
  ) {
    this.sdk = new Stripe(secretKey, {
      apiVersion: '2026-05-27.dahlia',
      typescript: true,
    })
  }

  async createCheckoutSession(input: StripeCheckoutSessionInput): Promise<StripeCheckoutSession> {
    const session = await this.sdk.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.customerEmail,
        client_reference_id: input.orderId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountCents,
              product_data: { name: `Order ${input.orderId}` },
            },
          },
        ],
        payment_intent_data: {
          metadata: { orderId: input.orderId },
        },
      },
      { idempotencyKey: input.idempotencyKey }
    )
    if (!session.url) throw new Error('stripe checkout session has no url')
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? '')
    return { id: session.id, url: session.url, paymentIntentId }
  }

  async refund(paymentIntentId: string, idempotencyKey: string): Promise<{ id: string }> {
    const refund = await this.sdk.refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey }
    )
    return { id: refund.id }
  }

  verifyWebhook(rawBody: string, signature: string): StripeWebhookEvent | null {
    try {
      const event = this.sdk.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
      return event as unknown as StripeWebhookEvent
    } catch {
      return null
    }
  }
}

// ─── Selector ─────────────────────────────────────────────────────────────

let cached: StripeClient | null = null
const fakeSingleton = new FakeStripe()

function stripeEnabledInConfig(): boolean {
  try {
    return getStoreConfig().payments.stripe.enabled === true
  } catch {
    return false
  }
}

/**
 * Decisión 3 / ADR 0038 (corregido): el fail-fast solo dispara cuando Stripe
 * está REALMENTE en uso. Condición = producción AND payments.stripe.enabled AND
 * sin claves. Así, el launch wire-only de Pi-Power (`stripe.enabled=false`, sin
 * claves) arranca contra el Fake sin brickearse; y un prod con tarjeta habilitada
 * pero sin claves falla ruidosamente en vez de degradar al Fake forjable.
 * En dev/test (no-producción) nunca lanza: el flujo de tarjeta se prueba contra
 * el Fake aunque `enabled` sea true.
 */
export function stripeFailFastInProd(
  hasKeys: boolean,
  nodeEnv: string | undefined = process.env.NODE_ENV,
  enabled: boolean = stripeEnabledInConfig()
): boolean {
  return !hasKeys && nodeEnv === 'production' && enabled
}

export function getStripeClient(): StripeClient {
  if (cached) return cached
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (secretKey && webhookSecret) {
    cached = new RealStripe(secretKey, webhookSecret)
    return cached
  }
  if (stripeFailFastInProd(false)) {
    throw new Error(
      'Stripe fail-fast: STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET son obligatorias en producción cuando payments.stripe.enabled=true. No se degrada al FakeStripe.'
    )
  }
  cached = fakeSingleton
  return cached
}

export function _getFakeStripe(): FakeStripe {
  return fakeSingleton
}

export function _resetStripe(): void {
  fakeSingleton._reset()
  cached = null
}

/** Solo para tests: fuerza el client. */
export function _setStripeClient(client: StripeClient | null): void {
  cached = client
}
