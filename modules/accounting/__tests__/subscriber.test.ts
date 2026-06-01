import { prisma } from '@/lib/db/client'
import { _resetSubscribers, dispatchPending, emitEvent, registerSubscriber } from '@/modules/events'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { seedChartOfAccounts } from '../seed'
import { accountingSubscriber } from '../subscriber'

beforeAll(async () => {
  await cleanDb()
  await seedChartOfAccounts()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.accountingPeriod.deleteMany()
  await prisma.eventDelivery.deleteMany()
  await prisma.domainEvent.deleteMany()
  _resetSubscribers()
  registerSubscriber(accountingSubscriber)
})

describe('accountingSubscriber — end-to-end con dispatcher', () => {
  it('invoice.issued via bus → asiento Dr CxC / Cr Ventas + EventDelivery DONE', async () => {
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
    expect(r.delivered).toBe(1)
    const entry = await prisma.journalEntry.findFirst({
      include: { lines: { include: { account: true } } },
    })
    expect(entry).not.toBeNull()
    expect(entry?.lines).toHaveLength(2)
    const debits = entry!.lines.reduce((s, l) => s + l.debitCents, 0n)
    const credits = entry!.lines.reduce((s, l) => s + l.creditCents, 0n)
    expect(debits).toBe(credits)
    expect(debits).toBe(5000n)
  })

  it('replay del mismo evento via dispatcher no duplica asientos', async () => {
    await prisma.$transaction(async (tx) => {
      await emitEvent(tx, {
        type: 'payment.captured',
        aggregateType: 'Payment',
        aggregateId: 'p-1',
        payload: { amountCents: 5000, cogsCents: 2000 },
      })
    })
    await dispatchPending({ batchSize: 10 })
    // Forzar replay: marca DomainEvent + EventDelivery como PENDING manualmente.
    // Saltamos guard append-only via raw SQL para test.
    await prisma.$executeRawUnsafe(
      `UPDATE "DomainEvent" SET status = 'PENDING'::"DomainEventStatus"`
    )
    await prisma.$executeRawUnsafe(
      `UPDATE "EventDelivery" SET status = 'PENDING'::"EventDeliveryStatus", attempts = 0`
    )
    await dispatchPending({ batchSize: 10 })
    const count = await prisma.journalEntry.count()
    expect(count).toBe(1) // idempotente por eventId
  })
})
