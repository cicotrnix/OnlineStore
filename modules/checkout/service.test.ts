import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { catalogService } from '@/modules/catalog'
import { customersService } from '@/modules/customers'
import { EmptyCartError, InsufficientStockError, ProductInactiveError } from '@/modules/orders'
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it } from 'vitest'
import { checkoutService } from './service'

async function seed() {
  await prisma.orderLine.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.quoteAuditLog.deleteMany()
  await prisma.quoteLine.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.approvalRequest.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.paymentEvent.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.organizationAddress.deleteMany()
  await prisma.customerPrice.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({ data: { email: 'co@test.com' } })
  const org = await customersService.createOrganization({
    name: 'Co Org',
    slug: 'co-org',
    ownerUserId: user.id,
  })
  // Fase 5 gate: checkout exige org VERIFIED.
  await prisma.organization.update({
    where: { id: org.id },
    data: { verificationStatus: 'VERIFIED', verifiedAt: new Date(), taxExempt: true },
  })
  const cat = await catalogService.createCategory({ slug: 'co-cat', name: 'C' })
  const product = await catalogService.createProduct({
    sku: 'CO-1',
    slug: 'co-1',
    name: 'CO 1',
    basePrice: 10,
    stockQuantity: 5,
    categoryId: cat.id,
  })
  const billing = await customersService.createAddress({
    organizationId: org.id,
    label: 'B',
    recipient: 'R',
    line1: 'L',
    city: 'C',
    postalCode: 'PP',
    country: 'US',
  })
  const shipping = await customersService.createAddress({
    organizationId: org.id,
    label: 'S',
    recipient: 'R',
    line1: 'L',
    city: 'C',
    postalCode: 'PP',
    country: 'US',
  })
  return { user, org, product, billing, shipping }
}

describe('checkoutService.review', () => {
  it('returns issue list when cart empty', async () => {
    const { user, org } = await seed()
    const r = await checkoutService.review({ userId: user.id, orgId: org.id })
    expect(r.issues).toEqual(['empty'])
  })

  it('flags price-changed when current price differs from snapshot', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    await prisma.customerPrice.create({
      data: {
        organizationId: org.id,
        productId: product.id,
        price: new Decimal('6.00'),
      },
    })
    const r = await checkoutService.review({ userId: user.id, orgId: org.id })
    expect(r.items[0]?.issues).toContain('price-changed')
    expect(r.issues).toContain('price-changed')
  })

  it('flags inactive product', async () => {
    const { user, org, product } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    await catalogService.updateProduct({ id: product.id, isActive: false })
    const r = await checkoutService.review({ userId: user.id, orgId: org.id })
    expect(r.issues).toContain('inactive')
  })
})

describe('checkoutService.confirm', () => {
  beforeEach(async () => {
    await seed()
  })

  it('places order on happy path', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    const order = await checkoutService.confirm({
      userId: user.id,
      orgId: org.id,
      billingAddressId: billing.id,
      shippingAddressId: shipping.id,
    })
    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/)
  })

  it('propagates InsufficientStockError', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 99,
      orgId: org.id,
    })
    await expect(
      checkoutService.confirm({
        userId: user.id,
        orgId: org.id,
        billingAddressId: billing.id,
        shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(InsufficientStockError)
  })

  it('propagates ProductInactiveError', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    await catalogService.updateProduct({ id: product.id, isActive: false })
    await expect(
      checkoutService.confirm({
        userId: user.id,
        orgId: org.id,
        billingAddressId: billing.id,
        shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(ProductInactiveError)
  })

  it('propagates EmptyCartError', async () => {
    const { user, org, billing, shipping } = await seed()
    await expect(
      checkoutService.confirm({
        userId: user.id,
        orgId: org.id,
        billingAddressId: billing.id,
        shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(EmptyCartError)
  })
})
