import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionsCreate = vi.fn()
const refundsCreate = vi.fn()
const constructEvent = vi.fn()

vi.mock('stripe', () => {
  return {
    default: class {
      checkout = { sessions: { create: sessionsCreate } }
      refunds = { create: refundsCreate }
      webhooks = { constructEvent }
    },
  }
})

const ORIG = { ...process.env }

beforeEach(() => {
  sessionsCreate.mockReset()
  refundsCreate.mockReset()
  constructEvent.mockReset()
  vi.resetModules()
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_WEBHOOK_SECRET
})

afterEach(() => {
  process.env = { ...ORIG }
})

describe('lib/stripe — adapter selection', () => {
  it('sin STRIPE_SECRET_KEY → FakeStripe', async () => {
    const { getStripeClient, _getFakeStripe } = await import('../index')
    const c = getStripeClient()
    expect(c).toBe(_getFakeStripe())
  })

  it('con STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET → RealStripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_abc'
    sessionsCreate.mockResolvedValue({
      id: 'cs_real_1',
      url: 'https://checkout.stripe.com/c/cs_real_1',
      payment_intent: 'pi_real_1',
    })
    const { getStripeClient } = await import('../index')
    const c = getStripeClient()
    const s = await c.createCheckoutSession({
      orderId: 'ord-1',
      amountCents: 5000,
      currency: 'USD',
      idempotencyKey: 'pay-ord-1',
      successUrl: 'http://s',
      cancelUrl: 'http://c',
    })
    expect(s.id).toBe('cs_real_1')
    expect(s.url).toBe('https://checkout.stripe.com/c/cs_real_1')
    expect(s.paymentIntentId).toBe('pi_real_1')
    expect(sessionsCreate).toHaveBeenCalledTimes(1)
    const [body, opts] = sessionsCreate.mock.calls[0]!
    expect(opts.idempotencyKey).toBe('pay-ord-1')
    expect(body.line_items[0].price_data.unit_amount).toBe(5000)
    expect(body.client_reference_id).toBe('ord-1')
  })

  it('RealStripe.refund pasa idempotency key estable al SDK', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_abc'
    refundsCreate.mockResolvedValue({ id: 're_real_1' })
    const { getStripeClient } = await import('../index')
    const r = await getStripeClient().refund('pi_x', 'refund-pay-1')
    expect(r.id).toBe('re_real_1')
    const [body, opts] = refundsCreate.mock.calls[0]!
    expect(body.payment_intent).toBe('pi_x')
    expect(opts.idempotencyKey).toBe('refund-pay-1')
  })

  it('RealStripe.verifyWebhook delega a sdk.webhooks.constructEvent; firma inválida → null', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_abc'
    constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const { getStripeClient } = await import('../index')
    const evt = getStripeClient().verifyWebhook('{}', 'sig_bad')
    expect(evt).toBeNull()
    expect(constructEvent).toHaveBeenCalledWith('{}', 'sig_bad', 'whsec_abc')
  })

  it('falta solo STRIPE_WEBHOOK_SECRET → FakeStripe (no se activa real)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    const { getStripeClient, _getFakeStripe } = await import('../index')
    expect(getStripeClient()).toBe(_getFakeStripe())
  })
})
