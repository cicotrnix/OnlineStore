import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import type { Prisma } from '@prisma/client'
import { ACCOUNT_CODES } from './chart'
import { ensureOpenPeriod } from './period'

/**
 * Línea de asiento (input). debit XOR credit, ambos en centavos enteros.
 */
export interface PostLineInput {
  accountCode: string
  debitCents?: bigint
  creditCents?: bigint
  memo?: string
}

export interface PostEntryInput {
  eventId: string
  eventType: string
  description?: string
  occurredAt: Date
  lines: PostLineInput[]
  reversesId?: string
}

export class UnbalancedEntryError extends Error {
  constructor(
    public debits: bigint,
    public credits: bigint
  ) {
    super(`Unbalanced entry: debits=${debits} credits=${credits}`)
    this.name = 'UnbalancedEntryError'
  }
}

export class ClosedPeriodError extends Error {
  constructor(period: string) {
    super(`Period ${period} is CLOSED`)
    this.name = 'ClosedPeriodError'
  }
}

/**
 * Postea un asiento balanceado dentro de una tx existente o crea su propia.
 * Idempotente por eventId (unique). El asiento es append-only.
 */
export async function postEntry(
  input: PostEntryInput,
  txArg?: Prisma.TransactionClient
): Promise<{ id: string; alreadyPosted: boolean }> {
  // Validación: débitos = créditos.
  let debits = 0n
  let credits = 0n
  for (const ln of input.lines) {
    debits += ln.debitCents ?? 0n
    credits += ln.creditCents ?? 0n
    if ((ln.debitCents ?? 0n) > 0n && (ln.creditCents ?? 0n) > 0n) {
      throw new Error(`Line must be debit XOR credit (account ${ln.accountCode})`)
    }
  }
  if (debits !== credits) throw new UnbalancedEntryError(debits, credits)
  if (debits === 0n) throw new Error('Entry with zero total')

  const run = async (tx: Prisma.TransactionClient) => {
    // Idempotencia.
    const dup = await tx.journalEntry.findUnique({ where: { eventId: input.eventId } })
    if (dup) return { id: dup.id, alreadyPosted: true }

    const period = await ensureOpenPeriod(input.occurredAt, tx)

    // Resolver códigos → accountId.
    const codes = [...new Set(input.lines.map((l) => l.accountCode))]
    const accounts = await tx.ledgerAccount.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    })
    const byCode = new Map(accounts.map((a) => [a.code, a.id]))
    for (const c of codes) {
      if (!byCode.has(c)) throw new Error(`Account not in chart: ${c}`)
    }

    const entry = await tx.journalEntry.create({
      data: {
        eventId: input.eventId,
        eventType: input.eventType,
        description: input.description,
        occurredAt: input.occurredAt,
        periodId: period.id,
        reversesId: input.reversesId,
        lines: {
          create: input.lines.map((ln) => ({
            accountId: byCode.get(ln.accountCode)!,
            debitCents: ln.debitCents ?? 0n,
            creditCents: ln.creditCents ?? 0n,
            memo: ln.memo,
          })),
        },
      },
    })
    logger.info(
      { entryId: entry.id, eventType: input.eventType, debits: String(debits) },
      'journal entry posted'
    )
    return { id: entry.id, alreadyPosted: false }
  }

  if (txArg) return run(txArg)
  return prisma.$transaction(run)
}

/**
 * Reglas de posteo por tipo de evento. Cada regla retorna el array de líneas
 * (o null para skip — ej: evento que no genera asiento).
 *
 * IMPORTANTE: los montos vienen del payload del evento en centavos.
 */
export interface PostingRuleContext {
  payload: Record<string, unknown>
  occurredAt: Date
}

export type PostingRule = (
  ctx: PostingRuleContext
) => Promise<PostLineInput[] | null> | PostLineInput[] | null

function cents(v: unknown): bigint {
  if (typeof v === 'bigint') return v
  if (typeof v === 'number') return BigInt(Math.round(v))
  if (typeof v === 'string') return BigInt(v)
  throw new Error(`expected cents-like, got ${typeof v}`)
}

export const POSTING_RULES: Record<string, PostingRule> = {
  'invoice.issued': ({ payload }) => {
    const amount = cents(payload.amountCents)
    return [
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debitCents: amount },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, creditCents: amount },
    ]
  },

  'payment.captured': ({ payload }) => {
    const amount = cents(payload.amountCents)
    const cogs = cents(payload.cogsCents ?? 0)
    const lines: PostLineInput[] = [
      { accountCode: ACCOUNT_CODES.STRIPE_CLEARING, debitCents: amount },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, creditCents: amount },
    ]
    if (cogs > 0n) {
      lines.push(
        { accountCode: ACCOUNT_CODES.COGS, debitCents: cogs },
        { accountCode: ACCOUNT_CODES.INVENTORY, creditCents: cogs }
      )
    }
    return lines
  },

  'payment.reconciled': ({ payload }) => {
    const amount = cents(payload.amountCents)
    const cogs = cents(payload.cogsCents ?? 0)
    const lines: PostLineInput[] = [
      { accountCode: ACCOUNT_CODES.CASH_BANK, debitCents: amount },
      { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, creditCents: amount },
    ]
    if (cogs > 0n) {
      lines.push(
        { accountCode: ACCOUNT_CODES.COGS, debitCents: cogs },
        { accountCode: ACCOUNT_CODES.INVENTORY, creditCents: cogs }
      )
    }
    return lines
  },

  'payment.refunded': ({ payload }) => {
    const amount = cents(payload.amountCents)
    // Reverso contable correcto:
    // - Dr Sales Returns (4100, contra-ingreso): reduce Revenue neto.
    // - Cr cuenta de cobranza (Stripe-clearing si fue tarjeta, Banco si wire/ACH):
    //   la plata sale por el mismo canal que entró.
    // - Si hubo COGS, también revierte Inventario/COGS.
    const method = String(payload.method ?? 'STRIPE_CARD').toUpperCase()
    const clearingAccount =
      method === 'WIRE' || method === 'ACH'
        ? ACCOUNT_CODES.CASH_BANK
        : ACCOUNT_CODES.STRIPE_CLEARING
    const restock = cents(payload.restockCents ?? 0)
    const lines: PostLineInput[] = [
      { accountCode: ACCOUNT_CODES.SALES_RETURNS, debitCents: amount },
      { accountCode: clearingAccount, creditCents: amount },
    ]
    if (restock > 0n) {
      lines.push(
        { accountCode: ACCOUNT_CODES.INVENTORY, debitCents: restock },
        { accountCode: ACCOUNT_CODES.COGS, creditCents: restock }
      )
    }
    return lines
  },
}
