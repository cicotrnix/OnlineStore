import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markExpiredQuotes } from '../expire'
import { accept, addLineToDraft, quote, reject, revise, submit } from '../service'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

beforeEach(cleanDb)

async function setupBuyer(slug: string) {
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug,
      paymentTerms: 'NET_30',
      creditLimit: new Decimal(100000),
    },
  })
  const buyer = await prisma.user.create({
    data: { email: `${slug}-buyer@test.com`, name: 'B' },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: buyer.id, role: 'BUYER' },
  })
  const admin = await prisma.user.create({
    data: { email: `${slug}-admin@test.com`, name: 'A', isPlatformAdmin: true },
  })
  const cat = await prisma.category.create({
    data: { name: 'C', slug: `${slug}-cat` },
  })
  const product = await prisma.product.create({
    data: {
      name: 'P',
      slug: `${slug}-prod`,
      sku: `SKU-${slug}`,
      basePrice: new Decimal('100'),
      stockQuantity: 50,
      categoryId: cat.id,
      isActive: true,
    },
  })
  const address = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'X',
      recipient: 'R',
      line1: 'L',
      city: 'C',
      postalCode: 'PP',
      country: 'US',
    },
  })
  return { org, buyer, admin, product, address }
}

describe('quotes.submit', () => {
  it('creates DRAFT + line, then submits with auto number', async () => {
    const { buyer, org, product } = await setupBuyer('qsub-1')
    const draft = await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 5,
    })
    expect(draft.status).toBe('DRAFT')

    const submitted = await submit({
      quoteId: draft.id,
      userId: buyer.id,
      notes: 'Need urgently',
    })

    expect(submitted.status).toBe('SUBMITTED')
    expect(submitted.number).toMatch(/^QU-\d{4}-\d{6}$/)
    expect(submitted.notes).toBe('Need urgently')
    expect(submitted.subtotal.toString()).toBe('500')
  })

  it('throws if no lines', async () => {
    const { buyer, org } = await setupBuyer('qsub-2')
    const draft = await prisma.quote.create({
      data: {
        number: 'tmp',
        organizationId: org.id,
        requestedById: buyer.id,
        status: 'DRAFT',
        currency: 'USD',
      },
    })
    await expect(submit({ quoteId: draft.id, userId: buyer.id })).rejects.toThrow(/no lines/i)
  })

  it('addLineToDraft is upsert (same product → qty sums)', async () => {
    const { buyer, org, product } = await setupBuyer('qsub-3')
    await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 3,
    })
    await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 2,
    })
    const lines = await prisma.quoteLine.findMany({ where: { productId: product.id } })
    expect(lines).toHaveLength(1)
    expect(lines[0]?.qty).toBe(5)
  })
})

describe('quotes.quote (admin sets prices)', () => {
  it('SUBMITTED → QUOTED with quoted prices', async () => {
    const { buyer, admin, org, product } = await setupBuyer('qq-1')
    const draft = await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 10,
    })
    const submitted = await submit({ quoteId: draft.id, userId: buyer.id })
    const lines = await prisma.quoteLine.findMany({ where: { quoteId: submitted.id } })

    const quoted = await quote({
      quoteId: submitted.id,
      adminUserId: admin.id,
      lines: [{ lineId: lines[0]?.id ?? '', unitPriceQuoted: 85 }],
      validUntil: new Date(Date.now() + 30 * 86400000),
      adminNotes: 'Special discount',
    })

    expect(quoted.status).toBe('QUOTED')
    expect(quoted.adminNotes).toBe('Special discount')
    expect(quoted.total.toString()).toBe('850')
  })
})

describe('quotes.revise', () => {
  it('QUOTED → still QUOTED with revisionCount++', async () => {
    const { buyer, admin, org, product } = await setupBuyer('qrev-1')
    const draft = await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 5,
    })
    const submitted = await submit({ quoteId: draft.id, userId: buyer.id })
    const lines = await prisma.quoteLine.findMany({ where: { quoteId: submitted.id } })
    await quote({
      quoteId: submitted.id,
      adminUserId: admin.id,
      lines: [{ lineId: lines[0]?.id ?? '', unitPriceQuoted: 90 }],
      validUntil: new Date(Date.now() + 30 * 86400000),
    })

    const revised = await revise({
      quoteId: submitted.id,
      adminUserId: admin.id,
      lines: [{ lineId: lines[0]?.id ?? '', unitPriceQuoted: 80 }],
    })

    expect(revised.status).toBe('QUOTED')
    expect(revised.revisionCount).toBe(1)
    expect(revised.total.toString()).toBe('400')
  })
})

describe('quotes.accept (PREPAID, no approvals/credit)', () => {
  it('QUOTED → ACCEPTED + Order CONFIRMED created', async () => {
    const { buyer, admin, org, product, address } = await setupBuyer('qacc-1')
    const draft = await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 3,
    })
    const submitted = await submit({ quoteId: draft.id, userId: buyer.id })
    const lines = await prisma.quoteLine.findMany({ where: { quoteId: submitted.id } })
    await quote({
      quoteId: submitted.id,
      adminUserId: admin.id,
      lines: [{ lineId: lines[0]?.id ?? '', unitPriceQuoted: 50 }],
      validUntil: new Date(Date.now() + 30 * 86400000),
    })

    const result = await accept({
      quoteId: submitted.id,
      userId: buyer.id,
      paymentMethod: 'PREPAID',
      billingAddressId: address.id,
      shippingAddressId: address.id,
    })

    expect(result.status).toBe('CONFIRMED')
    const order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId } })
    expect(order.status).toBe('CONFIRMED')
    expect(order.total.toString()).toBe('150')

    const acceptedQuote = await prisma.quote.findUniqueOrThrow({
      where: { id: submitted.id },
    })
    expect(acceptedQuote.status).toBe('ACCEPTED')
    expect(acceptedQuote.convertedOrderId).toBe(result.orderId)

    const stockAfter = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    })
    expect(stockAfter.stockQuantity).toBe(47)
  })
})

describe('quotes.reject', () => {
  it('QUOTED → REJECTED by requester', async () => {
    const { buyer, admin, org, product } = await setupBuyer('qrej-1')
    const draft = await addLineToDraft({
      userId: buyer.id,
      organizationId: org.id,
      productId: product.id,
      qty: 1,
    })
    const submitted = await submit({ quoteId: draft.id, userId: buyer.id })
    const lines = await prisma.quoteLine.findMany({ where: { quoteId: submitted.id } })
    await quote({
      quoteId: submitted.id,
      adminUserId: admin.id,
      lines: [{ lineId: lines[0]?.id ?? '', unitPriceQuoted: 100 }],
      validUntil: new Date(Date.now() + 30 * 86400000),
    })

    const rejected = await reject({ quoteId: submitted.id, userId: buyer.id })
    expect(rejected.status).toBe('REJECTED')
  })
})

describe('quotes.markExpiredQuotes', () => {
  it('QUOTED past validUntil → EXPIRED', async () => {
    const { buyer, org } = await setupBuyer('qexp-1')
    await prisma.quote.create({
      data: {
        number: 'QU-2099-999991',
        organizationId: org.id,
        requestedById: buyer.id,
        status: 'QUOTED',
        validUntil: new Date(Date.now() - 86400000),
        currency: 'USD',
      },
    })

    const result = await markExpiredQuotes()
    expect(result.updated).toBe(1)
  })
})
