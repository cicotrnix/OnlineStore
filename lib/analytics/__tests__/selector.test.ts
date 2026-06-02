import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const posthogCapture = vi.fn()
const posthogShutdown = vi.fn().mockResolvedValue(undefined)
const fetchMock = vi.fn()

vi.mock('posthog-node', () => ({
  PostHog: class {
    capture = posthogCapture
    shutdown = posthogShutdown
    constructor(_apiKey: string, _opts: unknown) {}
  },
}))

const ORIG = { ...process.env }
const realFetch = globalThis.fetch

beforeEach(() => {
  posthogCapture.mockReset()
  posthogShutdown.mockClear()
  fetchMock.mockReset()
  vi.resetModules()
  for (const k of ['POSTHOG_API_KEY', 'POSTHOG_HOST', 'GA4_MEASUREMENT_ID', 'GA4_API_SECRET']) {
    delete process.env[k]
  }
  // Force non-test mode para verificar el selector real.
  vi.stubEnv('NODE_ENV', 'production')
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  vi.unstubAllEnvs()
  process.env = { ...ORIG }
  globalThis.fetch = realFetch
})

describe('lib/analytics — adapter selection', () => {
  it('sin env vars (NODE_ENV != test) → FakeAnalytics', async () => {
    const { getAnalyticsClient, _getFakeAnalytics } = await import('../index')
    const c = getAnalyticsClient()
    expect(c).toBe(_getFakeAnalytics())
  })

  it('con POSTHOG_API_KEY → invoca posthog.capture; sin GA4 no llama fetch', async () => {
    process.env.POSTHOG_API_KEY = 'phc_real'
    const { getAnalyticsClient } = await import('../index')
    await getAnalyticsClient().capture({
      name: 'order.placed',
      distinctId: 'user-1',
      properties: { foo: 'bar' },
    })
    expect(posthogCapture).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('con GA4 (id + secret) → POST a Measurement Protocol con dots → underscores', async () => {
    process.env.GA4_MEASUREMENT_ID = 'G-XXX'
    process.env.GA4_API_SECRET = 'sec'
    fetchMock.mockResolvedValue({ ok: true })
    const { getAnalyticsClient } = await import('../index')
    await getAnalyticsClient().capture({
      name: 'payment.captured',
      distinctId: 'user-2',
      properties: { amountCents: 5000 },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0]![0] as string
    expect(url).toMatch(/measurement_id=G-XXX/)
    expect(url).toMatch(/api_secret=sec/)
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
    expect(body.events[0].name).toBe('payment_captured') // dots → underscores GA4
  })

  it('POSTHOG_API_KEY + GA4 ambos → captura a las dos backends', async () => {
    process.env.POSTHOG_API_KEY = 'phc'
    process.env.GA4_MEASUREMENT_ID = 'G-Y'
    process.env.GA4_API_SECRET = 's'
    fetchMock.mockResolvedValue({ ok: true })
    const { getAnalyticsClient } = await import('../index')
    await getAnalyticsClient().capture({ name: 'invoice.issued' })
    expect(posthogCapture).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('NODE_ENV=test ignora env vars y siempre da Fake', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    process.env.POSTHOG_API_KEY = 'phc_should_be_ignored'
    const { getAnalyticsClient, _getFakeAnalytics } = await import('../index')
    expect(getAnalyticsClient()).toBe(_getFakeAnalytics())
  })
})
