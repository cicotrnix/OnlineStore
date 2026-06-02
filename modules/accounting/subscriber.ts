import { logger } from '@/lib/observability/logger'
import type { DomainEventRecord, Subscriber } from '@/modules/events'
import { POSTING_RULES, postEntry } from './posting'

/**
 * Suscriptor de contabilidad: escucha eventos financieramente relevantes y
 * postea asientos. Idempotente por eventId (constraint).
 */
export const accountingSubscriber: Subscriber = {
  name: 'accounting',
  handles: ['invoice.issued', 'payment.captured', 'payment.reconciled', 'payment.refunded'],
  async handle(event: DomainEventRecord): Promise<void> {
    const rule = POSTING_RULES[event.type]
    if (!rule) {
      logger.warn({ eventType: event.type }, 'no posting rule for event')
      return
    }
    const lines = await rule({
      payload: event.payload as Record<string, unknown>,
      occurredAt: event.occurredAt,
    })
    if (!lines || lines.length === 0) return
    await postEntry({
      eventId: event.id,
      eventType: event.type,
      occurredAt: event.occurredAt,
      lines,
    })
  },
}
