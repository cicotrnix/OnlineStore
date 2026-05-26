import { prisma } from '@/lib/db/client'
import { dispatch } from '@/modules/notifications'
import storeConfig from '@/store.config'
import type { Quote } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { convertQuoteToOrder } from './conversion'
import { generateQuoteNumber } from './numbers'

export interface AddLineInput {
  userId: string
  organizationId: string
  productId: string
  qty: number
}

export async function addLineToDraft(input: AddLineInput): Promise<Quote> {
  return prisma.$transaction(async (tx) => {
    let draft = await tx.quote.findFirst({
      where: {
        organizationId: input.organizationId,
        requestedById: input.userId,
        status: 'DRAFT',
      },
    })
    if (!draft) {
      draft = await tx.quote.create({
        data: {
          number: `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          organizationId: input.organizationId,
          requestedById: input.userId,
          status: 'DRAFT',
          currency: storeConfig.currency.base,
        },
      })
    }

    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } })
    const existingLine = await tx.quoteLine.findFirst({
      where: { quoteId: draft.id, productId: input.productId },
    })

    if (existingLine) {
      await tx.quoteLine.update({
        where: { id: existingLine.id },
        data: { qty: existingLine.qty + input.qty },
      })
    } else {
      await tx.quoteLine.create({
        data: {
          quoteId: draft.id,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          qty: input.qty,
          unitPriceBase: product.basePrice,
        },
      })
    }

    return tx.quote.findUniqueOrThrow({ where: { id: draft.id } })
  })
}

export interface SubmitInput {
  quoteId: string
  userId: string
  notes?: string
}

export async function submit(input: SubmitInput): Promise<Quote> {
  return prisma.$transaction(async (tx) => {
    const draft = await tx.quote.findUniqueOrThrow({
      where: { id: input.quoteId },
      include: { lines: true },
    })
    if (draft.status !== 'DRAFT') {
      throw new Error(`Quote ${draft.id} not in DRAFT (status: ${draft.status})`)
    }
    if (draft.requestedById !== input.userId) throw new Error('Not the requester')
    if (draft.lines.length === 0) throw new Error('Quote has no lines')

    const subtotal = draft.lines.reduce(
      (sum, l) => sum.add(l.unitPriceBase.mul(l.qty)),
      new Decimal(0)
    )
    const number = await generateQuoteNumber(tx)

    const submitted = await tx.quote.update({
      where: { id: draft.id },
      data: {
        number,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        subtotal,
        total: subtotal,
        notes: input.notes ?? null,
      },
    })

    await tx.quoteAuditLog.create({
      data: {
        quoteId: draft.id,
        action: 'submitted',
        actorId: input.userId,
        payload: { lineCount: draft.lines.length, subtotal: subtotal.toString() },
      },
    })

    const admins = await tx.user.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true },
    })
    if (admins.length > 0) {
      await dispatch({
        userIds: admins.map((a) => a.id),
        type: 'QUOTE_SUBMITTED',
        title: `Nueva solicitud de cotización ${number}`,
        body: `${input.notes ?? 'Sin notas'} — total estimado $${subtotal.toFixed(2)}`,
        link: `/admin/quotes/${draft.id}`,
        subjectType: 'QUOTE',
        subjectId: draft.id,
      })
    }

    return submitted
  })
}

export interface QuoteInput {
  quoteId: string
  adminUserId: string
  lines: Array<{ lineId: string; unitPriceQuoted: number | string }>
  validUntil: Date
  adminNotes?: string
}

export async function quote(input: QuoteInput): Promise<Quote> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.quote.findUniqueOrThrow({
      where: { id: input.quoteId },
      include: { lines: true },
    })
    if (existing.status !== 'SUBMITTED') {
      throw new Error(`Quote not in SUBMITTED (status: ${existing.status})`)
    }

    let total = new Decimal(0)
    for (const lineInput of input.lines) {
      const line = existing.lines.find((l) => l.id === lineInput.lineId)
      if (!line) throw new Error(`Line ${lineInput.lineId} not found`)
      const price = new Decimal(lineInput.unitPriceQuoted as Decimal.Value)
      const lineTotal = price.mul(line.qty)
      await tx.quoteLine.update({
        where: { id: line.id },
        data: { unitPriceQuoted: price, lineTotal },
      })
      total = total.add(lineTotal)
    }

    const quoted = await tx.quote.update({
      where: { id: input.quoteId },
      data: {
        status: 'QUOTED',
        quotedAt: new Date(),
        quotedById: input.adminUserId,
        validUntil: input.validUntil,
        adminNotes: input.adminNotes ?? null,
        total,
      },
    })

    await tx.quoteAuditLog.create({
      data: {
        quoteId: input.quoteId,
        action: 'quoted',
        actorId: input.adminUserId,
        payload: { total: total.toString() },
      },
    })

    await dispatch({
      userIds: [existing.requestedById],
      type: 'QUOTE_QUOTED',
      title: `Cotización ${existing.number} lista`,
      body: `Tu cotización fue procesada. Total: $${total.toFixed(2)}. Válida hasta ${input.validUntil.toISOString().slice(0, 10)}.`,
      link: `/quotes/${existing.id}`,
      subjectType: 'QUOTE',
      subjectId: existing.id,
    })

    return quoted
  })
}

export interface ReviseInput {
  quoteId: string
  adminUserId: string
  lines: Array<{ lineId: string; unitPriceQuoted: number | string }>
  validUntil?: Date
  adminNotes?: string
}

export async function revise(input: ReviseInput): Promise<Quote> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.quote.findUniqueOrThrow({
      where: { id: input.quoteId },
      include: { lines: true },
    })
    if (existing.status !== 'QUOTED') {
      throw new Error(`Quote not in QUOTED (status: ${existing.status})`)
    }

    const prevSnapshot = existing.lines.map((l) => ({
      id: l.id,
      sku: l.sku,
      qty: l.qty,
      unitPriceQuoted: l.unitPriceQuoted?.toString() ?? null,
      lineTotal: l.lineTotal.toString(),
    }))

    let total = new Decimal(0)
    for (const lineInput of input.lines) {
      const line = existing.lines.find((l) => l.id === lineInput.lineId)
      if (!line) throw new Error(`Line ${lineInput.lineId} not found`)
      const price = new Decimal(lineInput.unitPriceQuoted as Decimal.Value)
      const lineTotal = price.mul(line.qty)
      await tx.quoteLine.update({
        where: { id: line.id },
        data: { unitPriceQuoted: price, lineTotal },
      })
      total = total.add(lineTotal)
    }

    const revised = await tx.quote.update({
      where: { id: input.quoteId },
      data: {
        revisionCount: { increment: 1 },
        lastRevisedAt: new Date(),
        validUntil: input.validUntil ?? existing.validUntil,
        adminNotes: input.adminNotes ?? existing.adminNotes,
        total,
      },
    })

    await tx.quoteAuditLog.create({
      data: {
        quoteId: input.quoteId,
        action: 'revised',
        actorId: input.adminUserId,
        payload: { previousLines: prevSnapshot, newTotal: total.toString() },
      },
    })

    await dispatch({
      userIds: [existing.requestedById],
      type: 'QUOTE_REVISED',
      title: `Cotización ${existing.number} actualizada`,
      body: `El equipo revisó tu cotización. Nuevo total: $${total.toFixed(2)}.`,
      link: `/quotes/${existing.id}`,
      subjectType: 'QUOTE',
      subjectId: existing.id,
    })

    return revised
  })
}

export interface AcceptInput {
  quoteId: string
  userId: string
  paymentMethod: 'PREPAID' | 'NET_TERMS'
  billingAddressId: string
  shippingAddressId: string
}

export async function accept(input: AcceptInput): Promise<{ orderId: string; status: string }> {
  return convertQuoteToOrder(input)
}

export async function reject(input: { quoteId: string; userId: string }): Promise<Quote> {
  return prisma.$transaction(async (tx) => {
    const q = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId } })
    if (q.status !== 'QUOTED') throw new Error('Quote not in QUOTED')
    if (q.requestedById !== input.userId) throw new Error('Only the requester can reject')

    const updated = await tx.quote.update({
      where: { id: input.quoteId },
      data: { status: 'REJECTED', decidedAt: new Date(), decidedById: input.userId },
    })

    await tx.quoteAuditLog.create({
      data: { quoteId: input.quoteId, action: 'rejected', actorId: input.userId },
    })

    const admins = await tx.user.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true },
    })
    if (admins.length > 0) {
      await dispatch({
        userIds: admins.map((a) => a.id),
        type: 'QUOTE_REJECTED',
        title: `Cotización ${q.number} rechazada`,
        body: 'El cliente rechazó la cotización.',
        link: `/admin/quotes/${q.id}`,
        subjectType: 'QUOTE',
        subjectId: q.id,
      })
    }

    return updated
  })
}
