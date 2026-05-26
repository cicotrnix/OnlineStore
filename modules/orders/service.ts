import { prisma } from '@/lib/db/client'
import storeConfig from '@/store.config'
import { Decimal } from '@prisma/client/runtime/library'
import { EmptyCartError, InsufficientStockError, ProductInactiveError } from './errors'
import { generateOrderNumber } from './orderNumber'
import {
  type PlaceOrderInput,
  type TransitionStatusInput,
  placeOrderSchema,
  transitionStatusSchema,
} from './schemas'

type OrderStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const ordersService = {
  async placeOrder(input: PlaceOrderInput) {
    const { userId, orgId, billingAddressId, shippingAddressId, poNumber, notes } =
      placeOrderSchema.parse(input)

    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      })
      if (!cart || cart.items.length === 0) throw new EmptyCartError()

      const productIds = cart.items.map((i) => i.productId)
      const lockedProducts = await tx.$queryRawUnsafe<
        Array<{
          id: string
          stockQuantity: number
          isActive: boolean
          sku: string
          name: string
        }>
      >(
        `SELECT id, "stockQuantity", "isActive", sku, name
         FROM "Product"
         WHERE id IN (${productIds.map((_, i) => `$${i + 1}`).join(',')})
         FOR UPDATE`,
        ...productIds
      )
      const productMap = new Map(lockedProducts.map((p) => [p.id, p]))

      let subtotal = new Decimal(0)
      for (const item of cart.items) {
        const p = productMap.get(item.productId)
        if (!p) throw new Error(`Product not found: ${item.productId}`)
        if (!p.isActive) throw new ProductInactiveError(item.productId)
        if (p.stockQuantity < item.quantity) {
          throw new InsufficientStockError(item.productId, p.stockQuantity, item.quantity)
        }
        subtotal = subtotal.add(item.unitPriceSnapshot.mul(item.quantity))
      }

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        })
      }

      const orderNumber = await generateOrderNumber()
      const order = await tx.order.create({
        data: {
          orderNumber,
          organizationId: orgId,
          placedByUserId: userId,
          status: 'PENDING_PAYMENT',
          poNumber: poNumber ?? null,
          notes: notes ?? null,
          billingAddressId,
          shippingAddressId,
          subtotal,
          total: subtotal,
          currency: storeConfig.currency.base,
          lines: {
            create: cart.items.map((item) => {
              const p = productMap.get(item.productId)
              if (!p) throw new Error(`Product not found in map: ${item.productId}`)
              const lineTotal = item.unitPriceSnapshot.mul(item.quantity)
              return {
                productId: item.productId,
                sku: p.sku,
                name: p.name,
                unitPrice: item.unitPriceSnapshot,
                quantity: item.quantity,
                lineTotal,
              }
            }),
          },
        },
        include: { lines: true },
      })

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      return order
    })
  },

  async cancel(input: { orderId: string; byUserId: string }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { lines: true },
      })
      if (!order) throw new Error('Order not found')
      if (!VALID_TRANSITIONS[order.status as OrderStatus]?.includes('CANCELLED')) {
        throw new Error(`Cannot cancel order in status ${order.status}`)
      }

      for (const line of order.lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockQuantity: { increment: line.quantity } },
        })
      }

      return tx.order.update({
        where: { id: input.orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledByUserId: input.byUserId,
        },
      })
    })
  },

  async transitionStatus(input: TransitionStatusInput) {
    const { orderId, newStatus } = transitionStatusSchema.parse(input)
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')
    if (!VALID_TRANSITIONS[order.status as OrderStatus]?.includes(newStatus)) {
      throw new Error(`Invalid transition ${order.status} → ${newStatus}`)
    }
    const timestampField = {
      CONFIRMED: 'confirmedAt',
      SHIPPED: 'shippedAt',
      DELIVERED: 'deliveredAt',
    }[newStatus]
    return prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus, [timestampField]: new Date() },
    })
  },

  async listForOrg(orgId: string) {
    return prisma.order.findMany({
      where: { organizationId: orgId },
      include: { lines: true },
      orderBy: { placedAt: 'desc' },
    })
  },

  async listAll() {
    return prisma.order.findMany({
      include: { lines: true, organization: true },
      orderBy: { placedAt: 'desc' },
    })
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true } },
        billingAddress: true,
        shippingAddress: true,
        organization: true,
        placedBy: true,
      },
    })
  },
}
