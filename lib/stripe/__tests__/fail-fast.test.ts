// Decisión 3 (ADR 0038): fail-fast estricto en producción. Sin claves Stripe,
// producción NO debe degradar al FakeStripe forjable; debe lanzar al boot.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { _resetStripe, getStripeClient } from '../index'

afterEach(() => {
  vi.unstubAllEnvs()
  _resetStripe()
})

describe('getStripeClient fail-fast en producción', () => {
  it('lanza en producción si faltan las claves Stripe (nunca FakeStripe)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    _resetStripe()
    expect(() => getStripeClient()).toThrow(/stripe/i)
  })

  it('en NO-producción cae al FakeStripe cuando faltan claves (DX preservado)', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    _resetStripe()
    const client = getStripeClient()
    expect(client).toBeDefined()
    expect(typeof (client as { verifyWebhook: unknown }).verifyWebhook).toBe('function')
  })
})

describe('FakeStripe.verifyWebhook usa comparación de firma segura', () => {
  it('rechaza firma de longitud distinta sin lanzar (timingSafeEqual-safe)', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    _resetStripe()
    const { _getFakeStripe } = await import('../index')
    const fake = _getFakeStripe()
    const { body } = fake._signPayload({ id: 'evt_1', type: 't', data: { object: {} } })
    expect(fake.verifyWebhook(body, 'short')).toBeNull()
  })
})
