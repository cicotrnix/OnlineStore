import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ACCOUNT_CODES } from '../chart'
import { closePeriod } from '../period'
import { POSTING_RULES, UnbalancedEntryError, postEntry } from '../posting'
import { seedChartOfAccounts } from '../seed'

beforeAll(async () => {
  await cleanDb()
  await seedChartOfAccounts()
})

beforeEach(async () => {
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.accountingPeriod.deleteMany()
})

describe('postEntry — invariantes contables', () => {
  it('rechaza asiento desbalanceado', async () => {
    await expect(
      postEntry({
        eventId: 'evt-bad-1',
        eventType: 'test',
        occurredAt: new Date(),
        lines: [
          { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debitCents: 100n },
          { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditCents: 50n },
        ],
      })
    ).rejects.toBeInstanceOf(UnbalancedEntryError)
  })

  it('rechaza línea con debit Y credit', async () => {
    await expect(
      postEntry({
        eventId: 'evt-bad-2',
        eventType: 'test',
        occurredAt: new Date(),
        lines: [{ accountCode: ACCOUNT_CODES.SALES_REVENUE, debitCents: 100n, creditCents: 100n }],
      })
    ).rejects.toThrow(/debit XOR credit/)
  })

  it('postea y es idempotente por eventId', async () => {
    const input = {
      eventId: 'evt-1',
      eventType: 'invoice.issued',
      occurredAt: new Date(),
      lines: [
        { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debitCents: 5000n },
        { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditCents: 5000n },
      ],
    }
    const a = await postEntry(input)
    const b = await postEntry(input)
    expect(a.id).toBe(b.id)
    expect(b.alreadyPosted).toBe(true)
    const entries = await prisma.journalEntry.count()
    expect(entries).toBe(1)
    const lines = await prisma.journalLine.count()
    expect(lines).toBe(2)
  })

  it('bloquea posteo en período CLOSED', async () => {
    const now = new Date('2026-03-15T12:00:00Z')
    await postEntry({
      eventId: 'evt-pre-close',
      eventType: 'invoice.issued',
      occurredAt: now,
      lines: [
        { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debitCents: 100n },
        { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditCents: 100n },
      ],
    })
    await closePeriod({ year: 2026, month: 3, closedBy: 'admin' })
    await expect(
      postEntry({
        eventId: 'evt-post-close',
        eventType: 'invoice.issued',
        occurredAt: new Date('2026-03-20T12:00:00Z'),
        lines: [
          { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debitCents: 100n },
          { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditCents: 100n },
        ],
      })
    ).rejects.toThrow(/CLOSED/)
  })
})

describe('POSTING_RULES — property: débitos = créditos para todas las reglas', () => {
  // Property test: para 100 payloads aleatorios, cada regla genera líneas balanceadas.
  it('invoice.issued, payment.captured, payment.reconciled, payment.refunded — todos balancean', async () => {
    const rng = () => BigInt(Math.floor(Math.random() * 1_000_000) + 1)
    for (let i = 0; i < 100; i++) {
      const amountCents = rng()
      const cogsCents = rng()
      const restockCents = rng()
      for (const [type, rule] of Object.entries(POSTING_RULES)) {
        const lines = await rule({
          payload: { amountCents, cogsCents, restockCents },
          occurredAt: new Date(),
        })
        if (!lines) continue
        const debits = lines.reduce((s, l) => s + (l.debitCents ?? 0n), 0n)
        const credits = lines.reduce((s, l) => s + (l.creditCents ?? 0n), 0n)
        expect(debits, `${type} iter ${i}`).toBe(credits)
        expect(debits).toBeGreaterThan(0n)
      }
    }
  })
})

describe('POSTING_RULES — montos correctos por regla', () => {
  it('invoice.issued: Dr CxC / Cr Ventas', async () => {
    const lines = (await POSTING_RULES['invoice.issued']!({
      payload: { amountCents: 5000n },
      occurredAt: new Date(),
    }))!
    const ar = lines.find((l) => l.accountCode === ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)!
    const rev = lines.find((l) => l.accountCode === ACCOUNT_CODES.SALES_REVENUE)!
    expect(ar.debitCents).toBe(5000n)
    expect(rev.creditCents).toBe(5000n)
  })

  it('payment.captured con cogs: 4 líneas (Stripe/CxC + COGS/Inv)', async () => {
    const lines = (await POSTING_RULES['payment.captured']!({
      payload: { amountCents: 5000n, cogsCents: 2000n },
      occurredAt: new Date(),
    }))!
    expect(lines).toHaveLength(4)
  })

  it('payment.refunded sin restock: solo reverso de cobro', async () => {
    const lines = (await POSTING_RULES['payment.refunded']!({
      payload: { amountCents: 5000n },
      occurredAt: new Date(),
    }))!
    expect(lines).toHaveLength(2)
    const ar = lines.find((l) => l.accountCode === ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)!
    expect(ar.debitCents).toBe(5000n)
  })
})
