/**
 * Integration test: reconcileWire atomically settles the Invoice.
 * TDD Task 2 — red first, then green after service.ts change.
 */
import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reconcileWire } from '../service'

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

beforeEach(cleanDb)

async function seed() {
  const org = await prisma.organization.create({
    data: {
      name: 'WireTestOrg',
      slug: `wire-org-${Date.now()}`,
      creditUsed: new Decimal(200), // will be decremented by invoice.amount (100)
      creditLimit: new Decimal(10000),
      paymentTerms: 'NET_30',
    },
  })

  const adminUser = await prisma.user.create({
    data: {
      email: `admin-wire-${Date.now()}@test.com`,
      name: 'Admin Wire',
    },
  })

  const address = await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      label: 'HQ',
      recipient: 'Test Recipient',
      line1: '123 Main St',
      city: 'Testville',
      postalCode: '12345',
      country: 'US',
    },
  })

  const category = await prisma.category.create({
    data: { name: 'Test Category', slug: `cat-${Date.now()}` },
  })

  const product = await prisma.product.create({
    data: {
      sku: `SKU-WIRE-${Date.now()}`,
      slug: `prod-wire-${Date.now()}`,
      name: 'Wire Test Product',
      basePrice: new Decimal(100),
      stockQuantity: 50,
      categoryId: category.id,
    },
  })

  // Order total = 100, matching amountCents = 10000 (cents)
  const order = await prisma.order.create({
    data: {
      orderNumber: `WIRE-ORD-${Date.now()}`,
      organizationId: org.id,
      placedByUserId: adminUser.id,
      subtotal: new Decimal(100),
      total: new Decimal(100),
      currency: 'USD',
      status: 'PENDING_PAYMENT',
      billingAddressId: address.id,
      shippingAddressId: address.id,
      paymentMethod: 'NET_TERMS',
    },
  })

  await prisma.orderLine.create({
    data: {
      orderId: order.id,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unitPrice: new Decimal(100),
      quantity: 1,
      lineTotal: new Decimal(100),
    },
  })

  return { org, adminUser, order, product }
}

describe('reconcileWire — settles invoice atomically', () => {
  it('marks payment CAPTURED, order CONFIRMED, invoice PAID, and decrements creditUsed', async () => {
    const { org, adminUser, order } = await seed()
    const wireReference = `WR-${Date.now()}`

    await reconcileWire({
      orderId: order.id,
      amountCents: 10000, // 100.00 USD in cents
      wireReference,
      adminUserId: adminUser.id,
    })

    // 1. Payment CAPTURED
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(payment.status).toBe('CAPTURED')

    // 2. Order CONFIRMED
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe('CONFIRMED')

    // 3. Invoice PAID + fields populated
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(invoice.status).toBe('PAID')
    expect(invoice.paidById).toBe(adminUser.id)
    expect(invoice.paidNote).toBe(wireReference)
    expect(invoice.paidAt).not.toBeNull()

    // 4. creditUsed: createInvoiceFromOrder increments 200→300 (credit consumed),
    //    settleInvoiceForPaidOrder then decrements 300→200 (credit released on payment).
    //    Net result after reconcile: 200.
    const updatedOrg = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(updatedOrg.creditUsed)).toBe(200)

    // 5. PaymentEvent row exists for the wire reference (idempotency dedup key)
    const pe = await prisma.paymentEvent.findUnique({
      where: { eventId: `wire-${order.id}-${wireReference}` },
    })
    expect(pe).not.toBeNull()
  })

  it('is idempotent: second reconcileWire call does not double-decrement creditUsed', async () => {
    const { org, adminUser, order } = await seed()
    const wireReference = `WR-IDEM-${Date.now()}`

    await reconcileWire({
      orderId: order.id,
      amountCents: 10000,
      wireReference,
      adminUserId: adminUser.id,
    })

    // Second call — must be a no-op (dedup by paymentEvent.eventId)
    await reconcileWire({
      orderId: order.id,
      amountCents: 10000,
      wireReference,
      adminUserId: adminUser.id,
    })

    // creditUsed still 200 — not double-decremented (second call is a no-op via dedup)
    const updatedOrg = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(updatedOrg.creditUsed)).toBe(200)

    // Only one paymentEvent row
    const count = await prisma.paymentEvent.count({
      where: { eventId: `wire-${order.id}-${wireReference}` },
    })
    expect(count).toBe(1)

    // Invoice still PAID
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(invoice.status).toBe('PAID')
  })
})
