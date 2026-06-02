import { prisma } from '@/lib/db/client'
import { _resetSubscribers, dispatchPending, emitEvent, registerSubscriber } from '@/modules/events'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  type HttpTransport,
  enqueueDeliveries,
  processPendingDeliveries,
  replayDelivery,
} from '../delivery'
import { signPayload, verifySignature } from '../sign'
import { webhookSubscriber } from '../subscriber'

const calls: Array<{ url: string; body: string; headers: Record<string, string> }> = []
function mockTransport(behavior: (url: string) => number = () => 200): HttpTransport {
  return {
    async post(url, body, headers) {
      calls.push({ url, body, headers })
      return { status: behavior(url) }
    },
  }
}

beforeEach(async () => {
  await cleanDb()
  calls.length = 0
  _resetSubscribers()
  registerSubscriber(webhookSubscriber)
})

describe('HMAC signing', () => {
  it('signPayload + verifySignature roundtrip', () => {
    const sig = signPayload('topsecret', '{"x":1}')
    expect(verifySignature('topsecret', '{"x":1}', sig)).toBe(true)
    expect(verifySignature('wrong', '{"x":1}', sig)).toBe(false)
    expect(verifySignature('topsecret', '{"x":2}', sig)).toBe(false)
  })
})

describe('enqueue + process', () => {
  it('enqueue por endpoint suscrito y firma con su secret', async () => {
    await prisma.webhookEndpoint.create({
      data: {
        url: 'https://hook.example/a',
        secret: 'sec-a',
        events: ['order.placed', 'payment.captured'],
      },
    })
    await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/b', secret: 'sec-b', events: ['payment.captured'] },
    })

    const r = await enqueueDeliveries({
      eventId: 'evt-1',
      eventType: 'order.placed',
      payload: { orderNumber: 'O-1' },
    })
    expect(r.enqueued).toBe(1) // solo el endpoint A suscrito a order.placed

    const r2 = await enqueueDeliveries({
      eventId: 'evt-2',
      eventType: 'payment.captured',
      payload: {},
    })
    expect(r2.enqueued).toBe(2)
  })

  it('enqueue idempotente por (endpointId, eventId)', async () => {
    const ep = await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/x', secret: 'sec', events: ['order.placed'] },
    })
    await enqueueDeliveries({ eventId: 'e1', eventType: 'order.placed', payload: {} })
    await enqueueDeliveries({ eventId: 'e1', eventType: 'order.placed', payload: {} })
    const count = await prisma.webhookDelivery.count({ where: { endpointId: ep.id } })
    expect(count).toBe(1)
  })

  it('process 2xx → DELIVERED; firma recibida verifica con secret del endpoint', async () => {
    const ep = await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/ok', secret: 'sec-ok', events: ['order.placed'] },
    })
    await enqueueDeliveries({
      eventId: 'e-ok',
      eventType: 'order.placed',
      payload: { orderNumber: 'O-1' },
    })
    const r = await processPendingDeliveries({ transport: mockTransport() })
    expect(r.delivered).toBe(1)
    const d = await prisma.webhookDelivery.findFirstOrThrow({ where: { endpointId: ep.id } })
    expect(d.status).toBe('DELIVERED')
    const sentSig = calls[0]?.headers['X-Webhook-Signature']?.replace(/^sha256=/, '') ?? ''
    expect(verifySignature(ep.secret, d.payload, sentSig)).toBe(true)
  })

  it('process 5xx → retry hasta MAX_ATTEMPTS=5 → FAILED', async () => {
    await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/down', secret: 'sec', events: ['order.placed'] },
    })
    await enqueueDeliveries({ eventId: 'e-down', eventType: 'order.placed', payload: {} })
    for (let i = 0; i < 5; i++) {
      await processPendingDeliveries({ transport: mockTransport(() => 503) })
    }
    const d = await prisma.webhookDelivery.findFirstOrThrow({ where: { eventId: 'e-down' } })
    expect(d.status).toBe('FAILED')
    expect(d.attempts).toBe(5)
  })

  it('replay re-encola FAILED como PENDING attempts=0', async () => {
    await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/down', secret: 'sec', events: ['order.placed'] },
    })
    await enqueueDeliveries({ eventId: 'e-r', eventType: 'order.placed', payload: {} })
    for (let i = 0; i < 5; i++) {
      await processPendingDeliveries({ transport: mockTransport(() => 503) })
    }
    const d = await prisma.webhookDelivery.findFirstOrThrow({ where: { eventId: 'e-r' } })
    await replayDelivery(d.id)
    const after = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: d.id } })
    expect(after.status).toBe('PENDING')
    expect(after.attempts).toBe(0)
    // Ahora la entrega siguiente con 200 → DELIVERED
    await processPendingDeliveries({ transport: mockTransport() })
    const final = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: d.id } })
    expect(final.status).toBe('DELIVERED')
  })

  it('e2e via bus: order.placed evento → webhook DELIVERED', async () => {
    await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/full', secret: 'sec', events: ['order.placed'] },
    })
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: 'ord-1',
        payload: { orderNumber: 'O-1' },
      })
    })
    await dispatchPending({ batchSize: 10 })
    await processPendingDeliveries({ transport: mockTransport() })
    const d = await prisma.webhookDelivery.findFirstOrThrow({
      where: { eventType: 'order.placed' },
    })
    expect(d.status).toBe('DELIVERED')
  })

  it('payment.failed NO se entrega (no está en subset público)', async () => {
    await prisma.webhookEndpoint.create({
      data: { url: 'https://hook.example/all', secret: 'sec', events: ['payment.failed'] },
    })
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'payment.failed',
        aggregateType: 'Payment',
        aggregateId: 'p-1',
        payload: {},
      })
    })
    await dispatchPending({ batchSize: 10 })
    const count = await prisma.webhookDelivery.count()
    expect(count).toBe(0)
  })
})
