import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markInvoicesOverdue, sendInvoiceDueSoon } from '../scheduled'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

async function setupBase(slug: string) {
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug,
      paymentTerms: 'NET_30',
      creditLimit: new Decimal(10000),
    },
  })
  const user = await prisma.user.create({ data: { email: `${slug}@test.com`, name: 'U' } })
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
  return { org, user, address }
}

describe('accounts.scheduled', () => {
  beforeEach(cleanDb)

  it('markInvoicesOverdue transitions PENDING past due to OVERDUE', async () => {
    const { org, user, address } = await setupBase('sch-1')
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2099-SCH001',
        organizationId: org.id,
        placedByUserId: user.id,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        subtotal: new Decimal(500),
        total: new Decimal(500),
        currency: 'USD',
        billingAddressId: address.id,
        shippingAddressId: address.id,
        paymentMethod: 'NET_TERMS',
      },
    })
    await prisma.invoice.create({
      data: {
        number: 'IN-2099-SCH001',
        organizationId: org.id,
        orderId: order.id,
        amount: new Decimal(500),
        currency: 'USD',
        dueDate: new Date(Date.now() - 86400000),
        status: 'PENDING',
      },
    })

    const result = await markInvoicesOverdue()
    expect(result.updated).toBe(1)
    const invs = await prisma.invoice.findMany({ where: { organizationId: org.id } })
    expect(invs[0]?.status).toBe('OVERDUE')
  })

  it('sendInvoiceDueSoon notifies ~3 days before due', async () => {
    const { org, user, address } = await setupBase('sch-2')
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2099-SCH002',
        organizationId: org.id,
        placedByUserId: user.id,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        subtotal: new Decimal(500),
        total: new Decimal(500),
        currency: 'USD',
        billingAddressId: address.id,
        shippingAddressId: address.id,
        paymentMethod: 'NET_TERMS',
      },
    })
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000)
    await prisma.invoice.create({
      data: {
        number: 'IN-2099-SCH002',
        organizationId: org.id,
        orderId: order.id,
        amount: new Decimal(500),
        currency: 'USD',
        dueDate: threeDaysFromNow,
        status: 'PENDING',
      },
    })

    const result = await sendInvoiceDueSoon()
    expect(result.notified).toBeGreaterThanOrEqual(1)
    const notifs = await prisma.notification.findMany({
      where: { userId: user.id, type: 'INVOICE_DUE_SOON' },
    })
    expect(notifs.length).toBeGreaterThanOrEqual(1)
  })
})
