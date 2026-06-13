// Decisión 3 (ADR 0038, corregido): fail-fast solo cuando Stripe está en uso.
// Caso crítico: el launch wire-only de Pi-Power (stripe.enabled=false, sin
// claves) NO debe brickearse en producción.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cfg = vi.hoisted(() => ({ stripeEnabled: false }))

vi.mock('@/stores', async () => {
  const actual = await vi.importActual<typeof import('@/stores')>('@/stores')
  return {
    ...actual,
    getStoreConfig: () => {
      const base = actual.getStoreConfig()
      return {
        ...base,
        payments: {
          ...base.payments,
          stripe: { ...base.payments.stripe, enabled: cfg.stripeEnabled },
        },
      }
    },
  }
})

import { _getFakeStripe, _resetStripe, getStripeClient, stripeFailFastInProd } from '../index'

beforeEach(() => {
  cfg.stripeEnabled = false
})

afterEach(() => {
  vi.unstubAllEnvs()
  _resetStripe()
})

describe('stripeFailFastInProd (lógica pura)', () => {
  // (hasKeys, nodeEnv, enabled) → ¿lanza?
  it('prod + tarjeta habilitada + sin claves → lanza', () => {
    expect(stripeFailFastInProd(false, 'production', true)).toBe(true)
  })
  it('prod + tarjeta DESHABILITADA (wire-only) + sin claves → NO lanza', () => {
    expect(stripeFailFastInProd(false, 'production', false)).toBe(false)
  })
  it('prod + habilitada + CON claves → NO lanza', () => {
    expect(stripeFailFastInProd(true, 'production', true)).toBe(false)
  })
  it('no-producción → NO lanza aunque esté habilitada y falten claves', () => {
    expect(stripeFailFastInProd(false, 'test', true)).toBe(false)
    expect(stripeFailFastInProd(false, 'development', true)).toBe(false)
  })
})

describe('getStripeClient (integración)', () => {
  it('LAUNCH WIRE-ONLY: producción + stripe.enabled=false + sin claves → FakeStripe, NO lanza', () => {
    cfg.stripeEnabled = false
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    _resetStripe()
    expect(() => getStripeClient()).not.toThrow()
    expect(getStripeClient()).toBe(_getFakeStripe())
  })

  it('producción + stripe.enabled=true + sin claves → lanza (no degrada al Fake forjable)', () => {
    cfg.stripeEnabled = true
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    _resetStripe()
    expect(() => getStripeClient()).toThrow(/stripe/i)
  })

  it('no-producción + sin claves → FakeStripe (DX preservado)', () => {
    cfg.stripeEnabled = true
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    _resetStripe()
    expect(getStripeClient()).toBe(_getFakeStripe())
  })
})

describe('FakeStripe.verifyWebhook usa comparación de firma segura', () => {
  it('rechaza firma de longitud distinta sin lanzar (timingSafeEqual-safe)', () => {
    vi.stubEnv('NODE_ENV', 'test')
    _resetStripe()
    const fake = _getFakeStripe()
    const { body } = fake._signPayload({ id: 'evt_1', type: 't', data: { object: {} } })
    expect(fake.verifyWebhook(body, 'short')).toBeNull()
  })
})
