import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { emitEvent } from '../outbox'

describe('emitEvent (outbox)', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('persiste un DomainEvent PENDING dentro de la transacción', async () => {
    const id = await prisma.$transaction((tx) =>
      emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: 'order-1',
        payload: { totalCents: 1000, currency: 'USD' },
      })
    )
    const ev = await prisma.domainEvent.findUnique({ where: { id } })
    expect(ev?.type).toBe('order.placed')
    expect((ev?.payload as { totalCents: number }).totalCents).toBe(1000)
  })

  it('es atómico: si la transacción falla, no queda evento', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await emitEvent(tx, {
          type: 'order.placed',
          aggregateType: 'Order',
          aggregateId: 'order-2',
          payload: {},
        })
        throw new Error('rollback')
      })
    ).rejects.toThrow('rollback')
    const count = await prisma.domainEvent.count({ where: { aggregateId: 'order-2' } })
    expect(count).toBe(0)
  })
})
