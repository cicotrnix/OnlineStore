import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import type { DomainEventType } from './contract'
import { type Subscriber, getSubscribersFor } from './registry'

const BATCH_SIZE = 20
const MAX_ATTEMPTS = 5

export interface DispatchResult {
  events: number
  delivered: number
  failed: number
}

export async function dispatchPending(opts?: {
  batchSize?: number
  resolve?: (type: DomainEventType) => Subscriber[]
}): Promise<DispatchResult> {
  const batchSize = opts?.batchSize ?? BATCH_SIZE
  const resolve = opts?.resolve ?? getSubscribersFor
  const result: DispatchResult = { events: 0, delivered: 0, failed: 0 }

  // Reclama un lote de eventos PENDING (FOR UPDATE SKIP LOCKED).
  const batch = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`
      SELECT id FROM "DomainEvent"
      WHERE status = 'PENDING'
      ORDER BY "occurredAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `)
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    await tx.domainEvent.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PROCESSING' },
    })
    return tx.domainEvent.findMany({ where: { id: { in: ids } } })
  })

  for (const event of batch) {
    result.events++
    const subs = resolve(event.type as DomainEventType)
    let allTerminal = true

    for (const sub of subs) {
      // Delivery idempotente por (eventId, subscriber).
      const delivery = await prisma.eventDelivery.upsert({
        where: { eventId_subscriber: { eventId: event.id, subscriber: sub.name } },
        create: { eventId: event.id, subscriber: sub.name },
        update: {},
      })
      if (delivery.status === 'DONE' || delivery.status === 'FAILED') continue

      try {
        await sub.handle({
          id: event.id,
          type: event.type as DomainEventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload as Record<string, unknown>,
          occurredAt: event.occurredAt,
        })
        await prisma.eventDelivery.update({
          where: { id: delivery.id },
          data: { status: 'DONE', processedAt: new Date(), lastError: null },
        })
        result.delivered++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const attempts = delivery.attempts + 1
        const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'
        await prisma.eventDelivery.update({
          where: { id: delivery.id },
          data: { status, attempts, lastError: message, processedAt: new Date() },
        })
        if (status === 'PENDING') allTerminal = false
        result.failed++
        logger.error(
          { eventId: event.id, subscriber: sub.name, attempt: attempts, err: message },
          'event delivery error'
        )
      }
    }

    // El evento queda DONE solo si todas sus entregas son terminales (DONE/FAILED).
    // Si alguna sigue PENDING, vuelve a PENDING para reintentarse el próximo tick.
    await prisma.domainEvent.update({
      where: { id: event.id },
      data: { status: allTerminal ? 'DONE' : 'PENDING' },
    })
  }

  return result
}
