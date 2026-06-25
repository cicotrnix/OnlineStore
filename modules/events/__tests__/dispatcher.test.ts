import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DomainEventType } from '../contract'
import { dispatchPending } from '../dispatcher'
import { emitEvent } from '../outbox'
import type { Subscriber } from '../registry'

async function seedEvent(type: DomainEventType = 'order.placed', aggregateId = 'o1') {
  return prisma.$transaction((tx) =>
    emitEvent(tx, { type, aggregateType: 'Order', aggregateId, payload: { n: 1 } })
  )
}

describe('dispatchPending', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('entrega un evento al suscriptor y marca delivery + evento DONE', async () => {
    const id = await seedEvent()
    const sub: Subscriber = {
      name: 'acct',
      handles: ['order.placed'],
      handle: vi.fn().mockResolvedValue(undefined),
    }
    const res = await dispatchPending({ resolve: () => [sub] })
    expect(sub.handle).toHaveBeenCalledOnce()
    expect(res.delivered).toBe(1)
    const ev = await prisma.domainEvent.findUnique({ where: { id } })
    expect(ev?.status).toBe('DONE')
    const del = await prisma.eventDelivery.findFirst({
      where: { eventId: id, subscriber: 'acct' },
    })
    expect(del?.status).toBe('DONE')
  })

  it('recupera un evento atascado en PROCESSING (occurredAt viejo) y lo re-procesa', async () => {
    const stuck = await prisma.domainEvent.create({
      data: {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: 'o1',
        payload: {},
        status: 'PROCESSING',
        occurredAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    })
    const sub: Subscriber = {
      name: 'acct',
      handles: ['order.placed'],
      handle: vi.fn().mockResolvedValue(undefined),
    }
    await dispatchPending({ resolve: () => [sub] })
    expect(sub.handle).toHaveBeenCalledOnce()
    const ev = await prisma.domainEvent.findUniqueOrThrow({ where: { id: stuck.id } })
    expect(ev.status).toBe('DONE')
  })

  it('NO recupera un PROCESSING reciente (worker activo, occurredAt nuevo)', async () => {
    const fresh = await prisma.domainEvent.create({
      data: {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: 'o2',
        payload: {},
        status: 'PROCESSING',
        occurredAt: new Date(),
      },
    })
    const sub: Subscriber = {
      name: 'acct',
      handles: ['order.placed'],
      handle: vi.fn().mockResolvedValue(undefined),
    }
    await dispatchPending({ resolve: () => [sub] })
    expect(sub.handle).not.toHaveBeenCalled()
    const ev = await prisma.domainEvent.findUniqueOrThrow({ where: { id: fresh.id } })
    expect(ev.status).toBe('PROCESSING')
  })

  it('es idempotente: re-correr no vuelve a invocar el handler', async () => {
    await seedEvent()
    const sub: Subscriber = {
      name: 'acct',
      handles: ['order.placed'],
      handle: vi.fn().mockResolvedValue(undefined),
    }
    await dispatchPending({ resolve: () => [sub] })
    await dispatchPending({ resolve: () => [sub] })
    expect(sub.handle).toHaveBeenCalledOnce()
  })

  it('un fallo deja delivery PENDING attempts=1 y reintenta en el próximo tick', async () => {
    await seedEvent()
    const handle = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)
    const sub: Subscriber = { name: 'acct', handles: ['order.placed'], handle }
    await dispatchPending({ resolve: () => [sub] })
    let del = await prisma.eventDelivery.findFirst({ where: { subscriber: 'acct' } })
    expect(del?.status).toBe('PENDING')
    expect(del?.attempts).toBe(1)
    await dispatchPending({ resolve: () => [sub] })
    del = await prisma.eventDelivery.findFirst({ where: { subscriber: 'acct' } })
    expect(del?.status).toBe('DONE')
    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('tras 5 fallos marca delivery FAILED', async () => {
    await seedEvent()
    const sub: Subscriber = {
      name: 'acct',
      handles: ['order.placed'],
      handle: vi.fn().mockRejectedValue(new Error('boom')),
    }
    for (let i = 0; i < 5; i++) await dispatchPending({ resolve: () => [sub] })
    const del = await prisma.eventDelivery.findFirst({ where: { subscriber: 'acct' } })
    expect(del?.status).toBe('FAILED')
    expect(del?.attempts).toBe(5)
  })

  it('suscriptores independientes: si uno falla, el otro igual entrega', async () => {
    await seedEvent()
    const ok: Subscriber = {
      name: 'ok',
      handles: ['order.placed'],
      handle: vi.fn().mockResolvedValue(undefined),
    }
    const bad: Subscriber = {
      name: 'bad',
      handles: ['order.placed'],
      handle: vi.fn().mockRejectedValue(new Error('x')),
    }
    await dispatchPending({ resolve: () => [ok, bad] })
    const okDel = await prisma.eventDelivery.findFirst({ where: { subscriber: 'ok' } })
    const badDel = await prisma.eventDelivery.findFirst({ where: { subscriber: 'bad' } })
    expect(okDel?.status).toBe('DONE')
    expect(badDel?.status).toBe('PENDING')
  })
})
