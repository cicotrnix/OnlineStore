import { prisma } from '@/lib/db/client'
import { cartService } from '@/modules/cart'
import { catalogService } from '@/modules/catalog'
import { customersService } from '@/modules/customers'
import { beforeEach, describe, expect, it } from 'vitest'
import { EmptyCartError, InsufficientStockError, ProductInactiveError } from './errors'
import { ordersService } from './service'

async function seed() {
  await prisma.orderLine.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.approvalRequest.deleteMany()
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

  const user = await prisma.user.create({ data: { email: 'buyer@test.com' } })
  const org = await customersService.createOrganization({
    name: 'Buyer Co',
    slug: 'buyer-co',
    ownerUserId: user.id,
  })
  const cat = await catalogService.createCategory({ slug: 'c-1', name: 'C' })
  const product = await catalogService.createProduct({
    sku: 'SKU-1',
    slug: 'p-1',
    name: 'P1',
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
    isDefaultBilling: true,
  })
  const shipping = await customersService.createAddress({
    organizationId: org.id,
    label: 'S',
    recipient: 'R',
    line1: 'L',
    city: 'C',
    postalCode: 'PP',
    country: 'US',
    isDefaultShipping: true,
  })
  return { user, org, product, billing, shipping }
}

describe('ordersService.placeOrder', () => {
  beforeEach(async () => {
    await seed()
  })

  it('creates order with snapshot lines, decrements stock, clears cart', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 2,
      orgId: org.id,
    })

    const order = await ordersService.placeOrder({
      userId: user.id,
      orgId: org.id,
      billingAddressId: billing.id,
      shippingAddressId: shipping.id,
      poNumber: 'PO-123',
      notes: 'Entregar AM',
    })

    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/)
    expect(order.status).toBe('PENDING_PAYMENT')
    expect(order.lines).toHaveLength(1)
    expect(order.lines[0]?.sku).toBe('SKU-1')
    expect(order.lines[0]?.unitPrice.toString()).toBe('10')
    expect(order.lines[0]?.quantity).toBe(2)
    expect(order.subtotal.toString()).toBe('20')

    const updatedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    })
    expect(updatedProduct.stockQuantity).toBe(3)

    const cart = await cartService.get(user.id)
    expect(cart.items).toHaveLength(0)
  })

  it('throws InsufficientStockError when stock too low', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 10,
      orgId: org.id,
    })

    await expect(
      ordersService.placeOrder({
        userId: user.id,
        orgId: org.id,
        billingAddressId: billing.id,
        shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(InsufficientStockError)
  })

  it('throws ProductInactiveError when product is inactive', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 1,
      orgId: org.id,
    })
    await catalogService.updateProduct({ id: product.id, isActive: false })

    await expect(
      ordersService.placeOrder({
        userId: user.id,
        orgId: org.id,
        billingAddressId: billing.id,
        shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(ProductInactiveError)
  })

  it('throws EmptyCartError when cart is empty', async () => {
    const { user, org, billing, shipping } = await seed()
    await expect(
      ordersService.placeOrder({
        userId: user.id,
        orgId: org.id,
        billingAddressId: billing.id,
        shippingAddressId: shipping.id,
      })
    ).rejects.toBeInstanceOf(EmptyCartError)
  })
})

describe('ordersService.cancel', () => {
  it('restores stock and sets cancelledByUserId', async () => {
    const { user, org, product, billing, shipping } = await seed()
    await cartService.addItem({
      userId: user.id,
      productId: product.id,
      quantity: 3,
      orgId: org.id,
    })
    const order = await ordersService.placeOrder({
      userId: user.id,
      orgId: org.id,
      billingAddressId: billing.id,
      shippingAddressId: shipping.id,
    })

    const stockBefore = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    })
    expect(stockBefore.stockQuantity).toBe(2)

    const cancelled = await ordersService.cancel({ orderId: order.id, byUserId: user.id })
    expect(cancelled.status).toBe('CANCELLED')
    expect(cancelled.cancelledByUserId).toBe(user.id)
    expect(cancelled.cancelledAt).toBeTruthy()

    const stockAfter = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    })
    expect(stockAfter.stockQuantity).toBe(5)
  })
})
