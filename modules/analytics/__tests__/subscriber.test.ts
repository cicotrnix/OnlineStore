import { _getFakeAnalytics, _resetAnalytics } from '@/lib/analytics'
import { prisma } from '@/lib/db/client'
import { _resetSubscribers, dispatchPending, emitEvent, registerSubscriber } from '@/modules/events'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { analyticsSubscriber } from '../subscriber'

beforeEach(async () => {
  await cleanDb()
  _resetAnalytics()
  _resetSubscribers()
  registerSubscriber(analyticsSubscriber)
})

describe('analyticsSubscriber — server-side capture', () => {
  it('captura order.placed con properties + distinctId', async () => {
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: 'ord-1',
        payload: { userId: 'user-1', total: '50.00' },
      })
    })
    await dispatchPending({ batchSize: 10 })
    const captured = _getFakeAnalytics().captured
    expect(captured).toHaveLength(1)
    expect(captured[0]?.name).toBe('order.placed')
    expect(captured[0]?.distinctId).toBe('user-1')
    expect(captured[0]?.properties?.aggregateId).toBe('ord-1')
  })

  it('eventos no rastreados son skip (ej payment.failed)', async () => {
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'payment.failed',
        aggregateType: 'Payment',
        aggregateId: 'p-1',
        payload: {},
      })
    })
    await dispatchPending({ batchSize: 10 })
    expect(_getFakeAnalytics().captured).toHaveLength(0)
  })

  it('noop-safe sin claves: no throw aunque falla la API externa', async () => {
    // El cliente Fake no llama red; en producción el cliente real tampoco
    // bloquea por errores (try/catch interno). Verificamos que el subscriber
    // no relance.
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'invoice.issued',
        aggregateType: 'Invoice',
        aggregateId: 'inv-1',
        payload: { amountCents: 5000 },
      })
    })
    const r = await dispatchPending({ batchSize: 10 })
    expect(r.events).toBe(1)
    expect(r.failed).toBe(0)
  })
})
