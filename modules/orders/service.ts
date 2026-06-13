import { prisma } from '@/lib/db/client'
import { getStoreConfig } from '@/stores'
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

/**
 * Ventana por defecto de pago para órdenes PENDING_PAYMENT (wire/ACH). Tras
 * vencerla sin pago, el cron `cancel-stale-pending-orders` libera el stock
 * reservado en placeOrder. Editable por orden vía `extendPaymentDue` (admin).
 */
const PAYMENT_DUE_DAYS = 3
const PAYMENT_DUE_MS = PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000

/**
 * Restaura el stock de una orden cancelable, la marca CANCELLED y emite
 * `order.cancelled` en la MISMA transacción. Punto único de cancelación: lo
 * usan tanto el admin (cancel) como el cron (cancelStalePendingOrders).
 */
async function cancelOrderInTx(
  tx: import('@prisma/client').Prisma.TransactionClient,
  orderId: string,
  byUserId: string | null
) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { lines: true } })
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

  const updated = await tx.order.update({
    where: { id: orderId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByUserId: byUserId },
  })

  const { emitEvent } = await import('@/modules/events')
  await emitEvent(tx, {
    type: 'order.cancelled',
    aggregateType: 'Order',
    aggregateId: orderId,
    payload: {
      orderNumber: updated.orderNumber,
      organizationId: updated.organizationId,
      reason: byUserId ? 'admin' : 'payment-window-expired',
    },
  })

  return updated
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
          paymentDueAt: new Date(Date.now() + PAYMENT_DUE_MS),
          poNumber: poNumber ?? null,
          notes: notes ?? null,
          billingAddressId,
          shippingAddressId,
          subtotal,
          total: subtotal,
          currency: getStoreConfig().currency.base,
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

      // Fase 5: bus events. order.placed → email + analytics + webhook.
      // invoice.issued solo se emite aquí si NO es prepaid-card-checkout:
      // - PREPAID puede ser tarjeta (Stripe Checkout) o wire/ACH manual.
      //   Para no emitir doble, dejamos que el webhook de Stripe emita en
      //   captura (ensureInvoiceAndEmit es idempotente: el segundo no crea).
      // - Hoy decidimos emitir invoice.issued en ambos casos al placement
      //   porque accrual reconoce ingreso al colocar la orden. La idempotencia
      //   por orderId UNIQUE en Invoice + UNIQUE en eventId garantiza no-doble.
      const { createInvoiceFromOrder } = await import('@/modules/accounts')
      const invoice = await createInvoiceFromOrder(order.id, tx)
      const { emitEvent } = await import('@/modules/events')
      const totalCents = Math.round(order.total.toNumber() * 100)
      await emitEvent(tx, {
        type: 'order.placed',
        aggregateType: 'Order',
        aggregateId: order.id,
        payload: {
          orderNumber: order.orderNumber,
          organizationId: order.organizationId,
          userId: order.placedByUserId,
          totalCents,
          currency: order.currency,
          paymentMethod: order.paymentMethod,
        },
      })
      await emitEvent(tx, {
        type: 'invoice.issued',
        aggregateType: 'Invoice',
        aggregateId: invoice.id,
        payload: {
          invoiceId: invoice.id,
          orderId: order.id,
          amountCents: totalCents,
          currency: order.currency,
          organizationId: order.organizationId,
        },
      })

      return order
    })
  },

  async cancel(input: { orderId: string; byUserId: string }) {
    return prisma.$transaction((tx) => cancelOrderInTx(tx, input.orderId, input.byUserId))
  },

  /**
   * Cron OPS-1: cancela órdenes PENDING_PAYMENT cuya ventana de pago venció
   * (paymentDueAt < ahora), restaurando stock y emitiendo order.cancelled.
   * El admin puede posponer una orden concreta vía `extendPaymentDue`.
   */
  async cancelStalePendingOrders(now: Date = new Date()) {
    const stale = await prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', paymentDueAt: { not: null, lt: now } },
      select: { id: true },
    })
    let cancelled = 0
    for (const { id } of stale) {
      try {
        await prisma.$transaction((tx) => cancelOrderInTx(tx, id, null))
        cancelled += 1
      } catch {
        // Estado cambió entre el SELECT y la tx (carrera con pago/cancel manual):
        // la orden ya no es cancelable, se omite.
      }
    }
    return { scanned: stale.length, cancelled }
  },

  /** Override de admin: extiende la ventana de pago de una orden PENDING_PAYMENT. */
  async extendPaymentDue(input: { orderId: string; dueAt: Date }) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } })
    if (!order) throw new Error('Order not found')
    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error(`Cannot extend payment window for order in status ${order.status}`)
    }
    return prisma.order.update({
      where: { id: input.orderId },
      data: { paymentDueAt: input.dueAt },
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

  async restoreStock(orderId: string, tx?: import('@prisma/client').Prisma.TransactionClient) {
    const client = tx ?? prisma
    const order = await client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { lines: true },
    })
    for (const line of order.lines) {
      await client.product.update({
        where: { id: line.productId },
        data: { stockQuantity: { increment: line.quantity } },
      })
    }
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
