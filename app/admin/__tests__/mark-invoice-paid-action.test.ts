/**
 * Integration test: markInvoicePaidAction routes through reconcileWire.
 * TDD Task 3 — red first (action still calls markPaid), green after rewire.
 */
import { prisma } from '@/lib/db/client'
import { createInvoiceFromOrder } from '@/modules/accounts'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'admin@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))
vi.mock('@/lib/auth/actions', () => ({
  impersonationStart: vi.fn(),
  impersonationStop: vi.fn(),
  switchActiveOrg: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }),
}))

beforeEach(async () => {
  await cleanDb()
})

async function seed() {
  const admin = await prisma.user.create({
    data: {
      email: `adm-wire-${Date.now()}-${Math.random()}@t.com`,
      isPlatformAdmin: true,
    },
  })
  authUser.id = admin.id
  authUser.email = admin.email

  const org = await prisma.organization.create({
    data: {
      name: 'WireActionOrg',
      slug: `wire-action-org-${Date.now()}`,
      creditUsed: new Decimal(100),
      creditLimit: new Decimal(10000),
      paymentTerms: 'NET_30',
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
    data: { name: 'Test Category', slug: `cat-action-${Date.now()}` },
  })

  const product = await prisma.product.create({
    data: {
      sku: `SKU-ACTION-WIRE-${Date.now()}`,
      slug: `prod-action-wire-${Date.now()}`,
      name: 'Wire Action Test Product',
      basePrice: new Decimal(40),
      stockQuantity: 50,
      categoryId: category.id,
    },
  })

  // Order total = 40, amountCents = 4000
  const order = await prisma.order.create({
    data: {
      orderNumber: `WIRE-ACT-${Date.now()}`,
      organizationId: org.id,
      placedByUserId: admin.id,
      subtotal: new Decimal(40),
      total: new Decimal(40),
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
      unitPrice: new Decimal(40),
      quantity: 1,
      lineTotal: new Decimal(40),
    },
  })

  // Pre-create the invoice (mirrors real-world flow: invoice issued when order placed).
  // reconcileWire's ensureInvoiceAndEmit will find it already exists and skip creation.
  const invoice = await createInvoiceFromOrder(order.id)

  return { admin, org, order, invoice, product }
}

describe('markInvoicePaidAction — routes through reconcileWire', () => {
  it('marks payment CAPTURED, order CONFIRMED, invoice PAID, decrements creditUsed, creates PaymentEvent', async () => {
    const { admin, org, order, invoice } = await seed()
    const wireReference = `ACT-WR-${Date.now()}`

    const fd = new FormData()
    fd.set('invoiceId', invoice.id)
    fd.set('paidNote', wireReference)

    const { markInvoicePaidAction } = await import('../_actions-fase2')
    await expect(markInvoicePaidAction(fd)).rejects.toThrow(
      /REDIRECT:.*toast=success.*msg=admin\.toast\.invoicePaid/
    )

    // 1. Payment CAPTURED
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } })
    expect(payment.status).toBe('CAPTURED')

    // 2. Order CONFIRMED
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updatedOrder.status).toBe('CONFIRMED')

    // 3. Invoice PAID with correct fields
    const updatedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })
    expect(updatedInvoice.status).toBe('PAID')
    expect(updatedInvoice.paidById).toBe(admin.id)
    expect(updatedInvoice.paidNote).toBe(wireReference)
    expect(updatedInvoice.paidAt).not.toBeNull()

    // 4. creditUsed: createInvoiceFromOrder incremented 100→140; settle decrements 140→100
    const updatedOrg = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(Number(updatedOrg.creditUsed)).toBe(100)

    // 5. PaymentEvent row with eventId = 'wire-' + reference (idempotency dedup key)
    const pe = await prisma.paymentEvent.findUnique({
      where: { eventId: `wire-${wireReference}` },
    })
    expect(pe).not.toBeNull()
  })
})
