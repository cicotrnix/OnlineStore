import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { checkCreditEligibility, recalcCreditUsed } from '../credit'

async function makeOrgWithAddress(
  slug: string,
  opts: { creditUsed?: number; creditLimit?: number | null } = {}
) {
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug,
      creditUsed: new Decimal(opts.creditUsed ?? 0),
      creditLimit: opts.creditLimit === null ? null : new Decimal(opts.creditLimit ?? 10000),
      paymentTerms: 'NET_30',
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
  return { org, address }
}

describe('accounts.checkCreditEligibility', () => {
  beforeEach(cleanDb)

  it('returns NO_CREDIT_LIMIT when org has no creditLimit', async () => {
    const { org } = await makeOrgWithAddress('cr-null', { creditLimit: null })
    const result = await checkCreditEligibility(org.id, 100)
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('NO_CREDIT_LIMIT')
  })

  it('blocks if invoices overdue', async () => {
    const { org } = await makeOrgWithAddress('cr-overdue', {
      creditUsed: 0,
      creditLimit: 10000,
    })
    const user = await prisma.user.create({ data: { email: 'cro@test.com', name: 'U' } })
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2099-000001',
        organizationId: org.id,
        placedByUserId: user.id,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        subtotal: new Decimal(500),
        total: new Decimal(500),
        currency: 'USD',
        billingAddressId: (
          await prisma.organizationAddress.findFirstOrThrow({
            where: { organizationId: org.id },
          })
        ).id,
        shippingAddressId: (
          await prisma.organizationAddress.findFirstOrThrow({
            where: { organizationId: org.id },
          })
        ).id,
        paymentMethod: 'NET_TERMS',
      },
    })
    await prisma.invoice.create({
      data: {
        number: 'IN-2099-000001',
        organizationId: org.id,
        orderId: order.id,
        amount: new Decimal(500),
        currency: 'USD',
        dueDate: new Date(Date.now() - 86400000),
        status: 'OVERDUE',
      },
    })

    const result = await checkCreditEligibility(org.id, 1000)
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('INVOICES_OVERDUE')
  })

  it('blocks if cart total exceeds available credit', async () => {
    const { org } = await makeOrgWithAddress('cr-exceeded', {
      creditUsed: 9500,
      creditLimit: 10000,
    })
    const result = await checkCreditEligibility(org.id, 1000)
    expect(result.eligible).toBe(false)
    expect(result.code).toBe('CREDIT_EXCEEDED')
    expect(result.available).toBe('500.00')
  })

  it('warns when utilization >= 80%', async () => {
    const { org } = await makeOrgWithAddress('cr-warn', {
      creditUsed: 7000,
      creditLimit: 10000,
    })
    const result = await checkCreditEligibility(org.id, 1500)
    expect(result.eligible).toBe(true)
    expect(result.warn).toBe(true)
  })

  it('allows if all checks pass', async () => {
    const { org } = await makeOrgWithAddress('cr-ok', {
      creditUsed: 1000,
      creditLimit: 10000,
    })
    const result = await checkCreditEligibility(org.id, 500)
    expect(result.eligible).toBe(true)
    expect(result.warn).toBe(false)
  })
})

describe('accounts.recalcCreditUsed', () => {
  beforeEach(cleanDb)

  it('sums PENDING + OVERDUE invoice amounts and updates org', async () => {
    const { org } = await makeOrgWithAddress('rec-1', {
      creditUsed: 0,
      creditLimit: 10000,
    })
    const user = await prisma.user.create({ data: { email: 'rec@test.com' } })
    const addr = await prisma.organizationAddress.findFirstOrThrow({
      where: { organizationId: org.id },
    })
    const baseOrderData = {
      organizationId: org.id,
      placedByUserId: user.id,
      status: 'CONFIRMED' as const,
      confirmedAt: new Date(),
      currency: 'USD',
      billingAddressId: addr.id,
      shippingAddressId: addr.id,
      paymentMethod: 'NET_TERMS' as const,
    }
    const o1 = await prisma.order.create({
      data: {
        ...baseOrderData,
        orderNumber: 'ORD-2099-100001',
        subtotal: new Decimal(300),
        total: new Decimal(300),
      },
    })
    const o2 = await prisma.order.create({
      data: {
        ...baseOrderData,
        orderNumber: 'ORD-2099-100002',
        subtotal: new Decimal(700),
        total: new Decimal(700),
      },
    })
    const o3 = await prisma.order.create({
      data: {
        ...baseOrderData,
        orderNumber: 'ORD-2099-100003',
        subtotal: new Decimal(2000),
        total: new Decimal(2000),
      },
    })
    await prisma.invoice.createMany({
      data: [
        {
          number: 'IN-2099-200001',
          organizationId: org.id,
          orderId: o1.id,
          amount: new Decimal(300),
          currency: 'USD',
          dueDate: new Date(),
          status: 'PENDING',
        },
        {
          number: 'IN-2099-200002',
          organizationId: org.id,
          orderId: o2.id,
          amount: new Decimal(700),
          currency: 'USD',
          dueDate: new Date(Date.now() - 86400000),
          status: 'OVERDUE',
        },
        {
          number: 'IN-2099-200003',
          organizationId: org.id,
          orderId: o3.id,
          amount: new Decimal(2000),
          currency: 'USD',
          dueDate: new Date(),
          status: 'PAID',
          paidAt: new Date(),
        },
      ],
    })

    const result = await recalcCreditUsed(org.id)
    expect(result.toString()).toBe('1000')
    const updated = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(updated.creditUsed.toString()).toBe('1000')
  })
})
