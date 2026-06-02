import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import type { DomainEventType } from '@/modules/events'
import { signPayload } from './sign'

const MAX_ATTEMPTS = 5

/**
 * HTTP transport pluggable (mockeable en tests).
 */
export interface HttpTransport {
  post(url: string, body: string, headers: Record<string, string>): Promise<{ status: number }>
}

export const defaultTransport: HttpTransport = {
  async post(url, body, headers) {
    const res = await fetch(url, { method: 'POST', body, headers })
    return { status: res.status }
  },
}

/**
 * Encola una entrega por endpoint suscrito al type. Idempotente por (endpointId, eventId).
 * Se llama desde un Subscriber del bus → at-least-once.
 */
export async function enqueueDeliveries(input: {
  eventId: string
  eventType: DomainEventType
  payload: Record<string, unknown>
}): Promise<{ enqueued: number }> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { isActive: true, events: { has: input.eventType } },
  })
  const signedBody = JSON.stringify({
    eventId: input.eventId,
    type: input.eventType,
    payload: input.payload,
  })
  let enqueued = 0
  for (const ep of endpoints) {
    const signature = signPayload(ep.secret, signedBody)
    try {
      await prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          eventId: input.eventId,
          eventType: input.eventType,
          payload: signedBody,
          signature,
        },
      })
      enqueued++
    } catch (err) {
      // Unique violation (endpointId, eventId) → ya estaba encolado: skip silenciosamente.
      const code = (err as { code?: string }).code
      if (code !== 'P2002') throw err
    }
  }
  return { enqueued }
}

/**
 * Procesa entregas PENDING. FOR UPDATE SKIP LOCKED, MAX_ATTEMPTS=5.
 */
export async function processPendingDeliveries(
  opts: { batchSize?: number; transport?: HttpTransport } = {}
): Promise<{ delivered: number; failed: number; processed: number }> {
  const batchSize = opts.batchSize ?? 20
  const transport = opts.transport ?? defaultTransport
  const result = { delivered: 0, failed: 0, processed: 0 }

  const batch = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(`
      SELECT id FROM "WebhookDelivery"
      WHERE status = 'PENDING' AND attempts < ${MAX_ATTEMPTS}
      ORDER BY "createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `)
    if (rows.length === 0) return []
    return tx.webhookDelivery.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { endpoint: true },
    })
  })

  for (const d of batch) {
    result.processed++
    try {
      const res = await transport.post(d.endpoint.url, d.payload, {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${d.signature}`,
        'X-Webhook-Event-Id': d.eventId,
        'X-Webhook-Event-Type': d.eventType,
      })
      if (res.status >= 200 && res.status < 300) {
        await prisma.webhookDelivery.update({
          where: { id: d.id },
          data: {
            status: 'DELIVERED',
            responseStatus: res.status,
            deliveredAt: new Date(),
            attempts: d.attempts + 1,
          },
        })
        result.delivered++
      } else {
        await markFailedOrRetry(d, `HTTP ${res.status}`, res.status)
        result.failed++
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      await markFailedOrRetry(d, reason, null)
      result.failed++
    }
  }
  return result
}

async function markFailedOrRetry(
  d: { id: string; attempts: number },
  reason: string,
  responseStatus: number | null
): Promise<void> {
  const attempts = d.attempts + 1
  const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'
  await prisma.webhookDelivery.update({
    where: { id: d.id },
    data: { status, attempts, lastError: reason, responseStatus: responseStatus ?? undefined },
  })
  logger.warn({ deliveryId: d.id, attempts, reason }, 'webhook delivery failed')
}

/**
 * Replay: re-encola una entrega marcada FAILED como PENDING attempts=0.
 * Acción admin (debería pasar step-up en el caller).
 */
export async function replayDelivery(deliveryId: string): Promise<void> {
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: 'PENDING', attempts: 0, lastError: null },
  })
}
