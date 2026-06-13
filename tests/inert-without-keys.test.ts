/**
 * Verificación crítica: sin **ninguna** env var de adaptadores externos, todo
 * cae al Fake/noop. Garantiza que el deploy a prod siga inerte.
 *
 * Las claves que se barren acá son las que activan adaptadores reales en Fase 5:
 *   - R2_* (storage)
 *   - STRIPE_*  (pagos)
 *   - FEDEX_*   (envíos)
 *   - POSTHOG_API_KEY, GA4_*  (analytics)
 *   - RESEND_API_KEY (email noop sin clave — comprobado en sendEmail return)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIG = { ...process.env }
const ENV_KEYS = [
  'R2_BUCKET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FEDEX_API_KEY',
  'FEDEX_API_SECRET',
  'FEDEX_ACCOUNT_NUMBER',
  'FEDEX_METER_NUMBER',
  'POSTHOG_API_KEY',
  'POSTHOG_HOST',
  'GA4_MEASUREMENT_ID',
  'GA4_API_SECRET',
  'RESEND_API_KEY',
]

beforeEach(() => {
  for (const k of ENV_KEYS) vi.stubEnv(k, '')
  // Importante: force NODE_ENV=production para que el selector real corra su
  // lógica con env vars (sino siempre devuelve Fake por shortcut de test mode).
  vi.stubEnv('NODE_ENV', 'production')
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  process.env = { ...ORIG }
})

describe('deploy inerte sin claves externas', () => {
  it('storage cae al FakeStorage', async () => {
    const { getStorage, _getFakeStorage: _ } = await import('@/lib/storage').then(async (m) => ({
      getStorage: m.getStorage,
      _getFakeStorage: null,
    }))
    const c = getStorage()
    await c.put('x', 'hello')
    const url = await c.signedUrl('x')
    expect(url).toMatch(/^fake:\/\//)
  })

  it('stripe cae al FakeStripe en wire-only (prod + stripe.enabled=false, sin claves)', async () => {
    // Pi-Power lanza wire-only: stripe.enabled=false. El fail-fast (ADR 0038)
    // solo dispara con stripe.enabled=true, así que aquí NO lanza: cae al Fake.
    const m = await import('@/lib/stripe')
    expect(m.getStripeClient()).toBe(m._getFakeStripe())
  })

  it('fedex cae al FakeFedex', async () => {
    const m = await import('@/lib/fedex')
    expect(m.getFedexClient()).toBe(m._getFakeFedex())
  })

  it('analytics cae al FakeAnalytics', async () => {
    const m = await import('@/lib/analytics')
    expect(m.getAnalyticsClient()).toBe(m._getFakeAnalytics())
  })

  it('sendEmail devuelve mock id sin RESEND_API_KEY (noop)', async () => {
    const { sendEmail } = await import('@/lib/email/resend')
    const r = await sendEmail({ to: 'x@x.com', subject: 's', html: '<p>hi</p>' })
    expect(r.id).toBe('noop-no-api-key')
  })
})
