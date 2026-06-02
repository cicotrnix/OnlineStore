/**
 * Cliente analytics server-side. Noop-safe sin claves (POSTHOG_API_KEY +
 * GA4_MEASUREMENT_ID + GA4_API_SECRET). En tests usa FakeAnalytics in-memory.
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

class PosthogGa4Analytics implements AnalyticsClient {
  constructor(
    private posthog: { apiKey: string; host: string } | null,
    private ga4: { measurementId: string; apiSecret: string } | null
  ) {}

  async capture(event: AnalyticsEvent): Promise<void> {
    // PostHog
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
    // GA4 Measurement Protocol
    if (this.ga4) {
      try {
        await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${this.ga4.measurementId}&api_secret=${this.ga4.apiSecret}`,
          {
            method: 'POST',
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

let fakeInstance: FakeAnalytics | null = null
let prodInstance: PosthogGa4Analytics | null = null

export function getAnalyticsClient(): AnalyticsClient {
  if (
    process.env.NODE_ENV === 'test' ||
    (!process.env.POSTHOG_API_KEY && !process.env.GA4_MEASUREMENT_ID)
  ) {
    if (!fakeInstance) fakeInstance = new FakeAnalytics()
    return fakeInstance
  }
  if (!prodInstance) {
    prodInstance = new PosthogGa4Analytics(
      process.env.POSTHOG_API_KEY
        ? {
            apiKey: process.env.POSTHOG_API_KEY,
            host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
          }
        : null,
      process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET
        ? {
            measurementId: process.env.GA4_MEASUREMENT_ID,
            apiSecret: process.env.GA4_API_SECRET,
          }
        : null
    )
  }
  return prodInstance
}

export function _resetAnalytics(): void {
  if (fakeInstance) fakeInstance._reset()
}

export function _getFakeAnalytics(): FakeAnalytics {
  return getAnalyticsClient() as FakeAnalytics
}
