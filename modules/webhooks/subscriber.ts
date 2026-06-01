import type { DomainEventRecord, DomainEventType, Subscriber } from '@/modules/events'
import { enqueueDeliveries } from './delivery'

/**
 * Subset curado del contrato interno expuesto a webhooks salientes.
 * No se exponen `payment.failed` ni `payment.authorized` (info-only interna).
 */
const PUBLIC_EVENTS: readonly DomainEventType[] = [
  'order.placed',
  'payment.captured',
  'payment.reconciled',
  'payment.refunded',
  'shipment.dispatched',
  'invoice.issued',
  'invoice.paid',
  'invoice.overdue',
]

export const webhookSubscriber: Subscriber = {
  name: 'webhooks',
  handles: PUBLIC_EVENTS,
  async handle(event: DomainEventRecord): Promise<void> {
    await enqueueDeliveries({
      eventId: event.id,
      eventType: event.type,
      payload: {
        ...event.payload,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt.toISOString(),
      },
    })
  },
}
