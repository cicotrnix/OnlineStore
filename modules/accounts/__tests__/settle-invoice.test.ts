import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settleInvoiceForPaidOrder } from '../invoices'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

beforeEach(cleanDb)

async function seed() {
  const org = await prisma.organization.create({
    data: {
      name: 'Acme',
      slug: `acme-${Date.now()}`,
      creditUsed: new Decimal(100),
      creditLimit: new Decimal(10000),
      paymentTerms: 'NET_30',
    },
  })
  const user = await prisma.user.create({
    data: { email: `a-${Date.now()}@t.com`, name: 'U' },
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
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-T-${Date.now()}`,
      organizationId: org.id,
      placedByUserId: user.id,
      subtotal: new Decimal(40),
      total: new Decimal(40),
      currency: 'USD',
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      billingAddressId: address.id,
      shippingAddressId: address.id,
      paymentMethod: 'NET_TERMS',
    },
  })
  const invoice = await prisma.invoice.create({
    data: {
      number: `IN-T-${Date.now()}`,
      orderId: order.id,
      organizationId: org.id,
      amount: new Decimal(40),
      currency: 'USD',
      status: 'PENDING',
      dueDate: new Date(),
      issuedAt: new Date(),
    },
  })
  return { org, user, order, invoice }
}

describe('settleInvoiceForPaidOrder', () => {
  it('marks invoice PAID, releases credit, and is idempotent on second call', async () => {
    const { org, order, user } = await seed()

    await prisma.$transaction((tx) =>
      settleInvoiceForPaidOrder(tx, {
        orderId: order.id,
        paidById: user.id,
        reference: 'WX-1',
      })
    )

    const inv = await prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(inv.status).toBe('PAID')
    expect(inv.paidById).toBe(user.id)
    expect(inv.paidNote).toBe('WX-1')
    expect(inv.paidAt).not.toBeNull()

    const o1 = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(o1.creditUsed)).toBe(60) // 100 − 40

    // idempotent: second call with same args does nothing
    await prisma.$transaction((tx) =>
      settleInvoiceForPaidOrder(tx, {
        orderId: order.id,
        paidById: user.id,
        reference: 'WX-1',
      })
    )
    const o2 = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(o2.creditUsed)).toBe(60) // NOT double-decremented
  })

  it('no-ops when no invoice exists for the orderId', async () => {
    const { user } = await seed()
    // call with a random orderId that has no invoice
    await expect(
      prisma.$transaction((tx) =>
        settleInvoiceForPaidOrder(tx, {
          orderId: `nonexistent-order-id-${Date.now()}`,
          paidById: user.id,
          reference: 'WX-2',
        })
      )
    ).resolves.toBeUndefined()
  })
})
