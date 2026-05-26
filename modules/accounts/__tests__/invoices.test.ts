import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import type { PaymentTerms } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInvoiceFromOrder, markPaid } from '../invoices'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

async function setupOrgWithOrder(
  slug: string,
  opts: {
    creditUsed?: number
    creditLimit?: number
    paymentTerms?: PaymentTerms
    confirmedAt?: Date
    total?: number
  } = {}
) {
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug,
      creditUsed: new Decimal(opts.creditUsed ?? 0),
      creditLimit: new Decimal(opts.creditLimit ?? 100000),
      paymentTerms: opts.paymentTerms ?? 'NET_30',
    },
  })
  const user = await prisma.user.create({
    data: { email: `${slug}@test.com`, name: 'U' },
  })
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
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
  const total = opts.total ?? 1000
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-2099-${slug.replace(/[^0-9]/g, '').padStart(6, '0')}`,
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'CONFIRMED',
      confirmedAt: opts.confirmedAt ?? new Date(),
      subtotal: new Decimal(total),
      total: new Decimal(total),
      currency: 'USD',
      billingAddressId: address.id,
      shippingAddressId: address.id,
      paymentMethod: 'NET_TERMS',
    },
  })
  return { org, user, address, order }
}

describe('accounts.createInvoiceFromOrder', () => {
  beforeEach(cleanDb)

  it('creates Invoice with dueDate = order.confirmedAt + paymentTerms days', async () => {
    const { order } = await setupOrgWithOrder('inv-100001', {
      paymentTerms: 'NET_30',
      confirmedAt: new Date('2026-06-01T00:00:00Z'),
    })

    const invoice = await createInvoiceFromOrder(order.id)

    expect(invoice.amount.toString()).toBe('1000')
    expect(invoice.status).toBe('PENDING')
    expect(invoice.number).toMatch(/^IN-\d{4}-\d{6}$/)
    expect(invoice.dueDate.toISOString().slice(0, 10)).toBe('2026-07-01')
  })

  it('increments Organization.creditUsed', async () => {
    const { org, order } = await setupOrgWithOrder('inv-100002', {
      creditUsed: 500,
      creditLimit: 10000,
      paymentTerms: 'NET_30',
      total: 1000,
    })

    await createInvoiceFromOrder(order.id)

    const updatedOrg = await prisma.organization.findUnique({ where: { id: org.id } })
    expect(updatedOrg?.creditUsed.toString()).toBe('1500')
  })
})

describe('accounts.markPaid', () => {
  beforeEach(cleanDb)

  it('marks invoice as PAID and decrements creditUsed', async () => {
    const { org, user, order } = await setupOrgWithOrder('paid-100001', {
      creditUsed: 1000,
      creditLimit: 10000,
      paymentTerms: 'NET_30',
      total: 1000,
    })
    const inv = await createInvoiceFromOrder(order.id)

    await markPaid({ invoiceId: inv.id, paidById: user.id, paidNote: 'wire ref 12345' })

    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paidNote).toBe('wire ref 12345')

    const updatedOrg = await prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
    })
    expect(updatedOrg.creditUsed.toString()).toBe('1000')
  })

  it('throws on second markPaid (idempotent)', async () => {
    const { user, order } = await setupOrgWithOrder('paid-100002')
    const inv = await createInvoiceFromOrder(order.id)
    await markPaid({ invoiceId: inv.id, paidById: user.id, paidNote: 'first' })

    await expect(
      markPaid({ invoiceId: inv.id, paidById: user.id, paidNote: 'second' })
    ).rejects.toThrow(/cannot be marked paid/)
  })
})
