/**
 * Cliente analytics server-side. Producción: PostHog (SDK posthog-node) + GA4
 * Measurement Protocol (HTTP); dev/test/CI: FakeAnalytics in-memory.
 *
 * Env vars (cualquiera activa parte del cliente real):
 *   - POSTHOG_API_KEY (+ POSTHOG_HOST opcional, default https://us.i.posthog.com)
 *   - GA4_MEASUREMENT_ID + GA4_API_SECRET (ambos requeridos para GA4)
 *
 * Sin ninguna de las dos backends → FakeAnalytics. La app sigue funcionando.
 * Si solo PostHog está configurado, GA4 queda inerte; viceversa.
 */
import { logger } from '@/lib/observability/logger'

// Type-only import — posthog-node carga worker_threads y rompe en CI cuando
// se importa al nivel de módulo. Cargamos dinámico sólo cuando hay claves.
type PostHogInstance = {
  capture(event: {
    distinctId: string
    event: string
    properties?: Record<string, unknown>
    timestamp?: Date
  }): void
  shutdown(): Promise<void>
}

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
  private posthog: PostHogInstance | null = null
  private posthogPromise: Promise<PostHogInstance | null> | null = null

  constructor(
    private readonly posthogCfg: { apiKey: string; host: string } | null,
    private readonly ga4: { measurementId: string; apiSecret: string } | null
  ) {}

  private async getPosthog(): Promise<PostHogInstance | null> {
    if (this.posthog) return this.posthog
    if (!this.posthogCfg) return null
    if (!this.posthogPromise) {
      const cfg = this.posthogCfg
      this.posthogPromise = (async () => {
        const mod = await import('posthog-node')
        const client = new mod.PostHog(cfg.apiKey, {
          host: cfg.host,
          flushAt: 1,
          flushInterval: 0,
        }) as unknown as PostHogInstance
        this.posthog = client
        return client
      })()
    }
    return this.posthogPromise
  }

  async capture(event: AnalyticsEvent): Promise<void> {
    if (this.posthogCfg) {
      try {
        const ph = await this.getPosthog()
        ph?.capture({
          distinctId: event.distinctId ?? 'anonymous',
          event: event.name,
          properties: event.properties,
          timestamp: event.timestamp,
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

  async shutdown(): Promise<void> {
    if (this.posthog) await this.posthog.shutdown()
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
            host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
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
