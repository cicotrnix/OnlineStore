import { getAnalyticsClient } from '@/lib/analytics'
import type { DomainEventRecord, DomainEventType, Subscriber } from '@/modules/events'

const TRACKED: readonly DomainEventType[] = [
  'order.placed',
  'payment.captured',
  'payment.reconciled',
  'payment.refunded',
  'shipment.dispatched',
  'invoice.issued',
  'invoice.paid',
  'customer.verified',
]

/**
 * Suscriptor que reenvía eventos de dominio a PostHog + GA4 server-side. Noop
 * sin claves.
 */
export const analyticsSubscriber: Subscriber = {
  name: 'analytics',
  handles: TRACKED,
  async handle(event: DomainEventRecord): Promise<void> {
    const client = getAnalyticsClient()
    const distinctId = String(
      event.payload.userId ?? event.payload.organizationId ?? event.aggregateId
    )
    await client.capture({
      name: event.type,
      distinctId,
      properties: {
        ...(event.payload as Record<string, unknown>),
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
      timestamp: event.occurredAt,
    })
  },
}
