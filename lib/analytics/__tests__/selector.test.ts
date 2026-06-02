import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

const ORIG = { ...process.env }
const realFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  vi.resetModules()
  for (const k of ['POSTHOG_API_KEY', 'POSTHOG_HOST', 'GA4_MEASUREMENT_ID', 'GA4_API_SECRET']) {
    vi.stubEnv(k, '')
  }
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

  it('con POSTHOG_API_KEY → POST a /capture/ con api_key + event', async () => {
    process.env.POSTHOG_API_KEY = 'phc_real'
    fetchMock.mockResolvedValue({ ok: true })
    const { getAnalyticsClient } = await import('../index')
    await getAnalyticsClient().capture({
      name: 'order.placed',
      distinctId: 'user-1',
      properties: { foo: 'bar' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0]![0] as string
    expect(url).toMatch(/posthog/i)
    expect(url).toMatch(/\/capture\/$/)
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
    expect(body.api_key).toBe('phc_real')
    expect(body.event).toBe('order.placed')
    expect(body.distinct_id).toBe('user-1')
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
    expect(body.events[0].name).toBe('payment_captured')
  })

  it('POSTHOG + GA4 ambos → captura a las dos backends', async () => {
    process.env.POSTHOG_API_KEY = 'phc'
    process.env.GA4_MEASUREMENT_ID = 'G-Y'
    process.env.GA4_API_SECRET = 's'
    fetchMock.mockResolvedValue({ ok: true })
    const { getAnalyticsClient } = await import('../index')
    await getAnalyticsClient().capture({ name: 'invoice.issued' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('NODE_ENV=test ignora env vars y siempre da Fake', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    process.env.POSTHOG_API_KEY = 'phc_should_be_ignored'
    const { getAnalyticsClient, _getFakeAnalytics } = await import('../index')
    expect(getAnalyticsClient()).toBe(_getFakeAnalytics())
  })
})
