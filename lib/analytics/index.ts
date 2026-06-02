/**
 * Cliente analytics server-side. Producción: PostHog (HTTP /capture/) + GA4
 * Measurement Protocol (HTTP); dev/test/CI: FakeAnalytics in-memory.
 *
 * Env vars (cualquiera activa parte del cliente real):
 *   - POSTHOG_API_KEY (+ POSTHOG_HOST opcional, default https://us.i.posthog.com)
 *   - GA4_MEASUREMENT_ID + GA4_API_SECRET (ambos requeridos para GA4)
 *
 * Sin ninguna de las dos backends → FakeAnalytics. La app sigue funcionando.
 * Si solo PostHog está configurado, GA4 queda inerte; viceversa.
 *
 * No usamos posthog-node SDK porque carga worker_threads y rompe el bundling
 * server-side de Next. El endpoint /capture/ acepta el mismo payload via POST
 * y nuestros volúmenes server-side son bajos (batching no es crítico).
 */
import { logger } from '@/lib/observability/logger'

export interface AnalyticsEvent {
  name: string
  distinctId?: string
  properties?: Record<string, unknown>
  timestamp?: Date
}

export interface AnalyticsClient {
  capture(event: AnalyticsEvent): Promise<void>
  shutdown?(): Promise<void>
}

class FakeAnalytics implements AnalyticsClient {
  public captured: AnalyticsEvent[] = []
  async capture(event: AnalyticsEvent): Promise<void> {
    this.captured.push(event)
  }
  _reset() {
    this.captured = []
  }
}

/**
 * Multiplexor PostHog + GA4. Errores de cada backend se logean pero no propagan
 * (un analytics caído no debe romper el bus de eventos).
 */
class PosthogGa4Analytics implements AnalyticsClient {
  constructor(
    private readonly posthog: { apiKey: string; host: string } | null,
    private readonly ga4: { measurementId: string; apiSecret: string } | null
  ) {}

  async capture(event: AnalyticsEvent): Promise<void> {
    if (this.posthog) {
      try {
        await fetch(`${this.posthog.host}/capture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: this.posthog.apiKey,
            event: event.name,
            distinct_id: event.distinctId ?? 'anonymous',
            properties: event.properties,
            timestamp: (event.timestamp ?? new Date()).toISOString(),
          }),
        })
      } catch (err) {
        logger.error({ err, event: event.name }, 'posthog capture failed')
      }
    }
    if (this.ga4) {
      try {
        await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
            this.ga4.measurementId
          )}&api_secret=${encodeURIComponent(this.ga4.apiSecret)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: event.distinctId ?? 'anonymous',
              events: [{ name: event.name.replace(/\./g, '_'), params: event.properties ?? {} }],
            }),
          }
        )
      } catch (err) {
        logger.error({ err, event: event.name }, 'ga4 capture failed')
      }
    }
  }
}

let cached: AnalyticsClient | null = null
let fakeInstance: FakeAnalytics | null = null

export function getAnalyticsClient(): AnalyticsClient {
  if (cached) return cached
  // Tests siempre Fake.
  if (process.env.NODE_ENV === 'test') {
    if (!fakeInstance) fakeInstance = new FakeAnalytics()
    cached = fakeInstance
    return cached
  }
  const posthogKey = process.env.POSTHOG_API_KEY
  const ga4Id = process.env.GA4_MEASUREMENT_ID
  const ga4Secret = process.env.GA4_API_SECRET
  const hasReal = !!posthogKey || (!!ga4Id && !!ga4Secret)
  if (hasReal) {
    cached = new PosthogGa4Analytics(
      posthogKey
        ? {
            apiKey: posthogKey,
            host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
          }
        : null,
      ga4Id && ga4Secret ? { measurementId: ga4Id, apiSecret: ga4Secret } : null
    )
  } else {
    if (!fakeInstance) fakeInstance = new FakeAnalytics()
    cached = fakeInstance
  }
  return cached
}

export function _resetAnalytics(): void {
  if (fakeInstance) fakeInstance._reset()
  cached = null
}

export function _getFakeAnalytics(): FakeAnalytics {
  if (!fakeInstance) fakeInstance = new FakeAnalytics()
  return fakeInstance
}

/** Solo para tests. */
export function _setAnalyticsClient(client: AnalyticsClient | null): void {
  cached = client
}
