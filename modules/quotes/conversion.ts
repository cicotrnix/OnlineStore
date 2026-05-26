import { prisma } from '@/lib/db/client'
import { CatalogAccessDeniedError, QuoteExpiredError } from '@/lib/errors'
import { isFeatureEnabled } from '@/lib/features'
import { checkCreditEligibility, createInvoiceFromOrder } from '@/modules/accounts'
import { request as requestApproval } from '@/modules/approvals'
import { InsufficientStockError } from '@/modules/orders'
import { generateOrderNumber } from '@/modules/orders/orderNumber'
import { Decimal } from '@prisma/client/runtime/library'

export interface ConvertInput {
  quoteId: string
  userId: string
  paymentMethod: 'PREPAID' | 'NET_TERMS'
  billingAddressId: string
  shippingAddressId: string
}

export async function convertQuoteToOrder(
  input: ConvertInput
): Promise<{ orderId: string; status: string }> {
  return prisma.$transaction(async (tx) => {
    const q = await tx.quote.findUniqueOrThrow({
      where: { id: input.quoteId },
      include: {
        lines: { include: { product: { include: { category: true } } } },
        organization: true,
      },
    })

    if (q.status !== 'QUOTED') {
      throw new Error(`Quote not in QUOTED (status: ${q.status})`)
    }
    if (q.validUntil && q.validUntil < new Date()) {
      throw new QuoteExpiredError(`Quote ${q.number} expired`)
    }

    for (const line of q.lines) {
      if (!line.product.isActive) {
        throw new Error(`Product ${line.sku} is no longer active`)
      }

      const lockResult = await tx.$queryRawUnsafe<Array<{ stockQuantity: number }>>(
        `SELECT "stockQuantity" FROM "Product" WHERE id = $1 FOR UPDATE`,
        line.productId
      )
      const currentStock = lockResult[0]?.stockQuantity ?? 0
      if (currentStock < line.qty) {
        throw new InsufficientStockError(line.productId, currentStock, line.qty)
      }

      if (isFeatureEnabled('privateCatalogs')) {
        if (line.product.isPrivate || line.product.category.isPrivate) {
          const access = await tx.organizationCatalogAccess.findFirst({
            where: {
              organizationId: q.organizationId,
              OR: [{ productId: line.productId }, { categoryId: line.product.categoryId }],
            },
          })
          if (!access) {
            throw new CatalogAccessDeniedError(`Product ${line.sku} not accessible to your org`)
          }
        }
      }
    }

    if (input.paymentMethod === 'NET_TERMS') {
      if (!isFeatureEnabled('credit')) {
        throw new Error('Credit feature not enabled')
      }
      const eligibility = await checkCreditEligibility(q.organizationId, q.total)
      if (!eligibility.eligible) {
        throw new Error(`Credit not eligible: ${eligibility.code} — ${eligibility.message}`)
      }
    }

    for (const line of q.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stockQuantity: { decrement: line.qty } },
      })
    }

    const needsApproval = isFeatureEnabled('approvals')
      ? Boolean(q.organization.approvalThreshold && q.total.gt(q.organization.approvalThreshold))
      : false

    const orderStatus = needsApproval ? 'PENDING_APPROVAL' : 'CONFIRMED'
    const orderNumber = await generateOrderNumber()

    const order = await tx.order.create({
      data: {
        orderNumber,
        organizationId: q.organizationId,
        placedByUserId: input.userId,
        status: orderStatus,
        confirmedAt: orderStatus === 'CONFIRMED' ? new Date() : null,
        subtotal: q.total,
        total: q.total,
        currency: q.currency,
        paymentMethod: input.paymentMethod,
        billingAddressId: input.billingAddressId,
        shippingAddressId: input.shippingAddressId,
        approvedFromQuote: { connect: { id: q.id } },
        lines: {
          create: q.lines.map((l) => ({
            productId: l.productId,
            sku: l.sku,
            name: l.name,
            unitPrice: l.unitPriceQuoted ?? l.unitPriceBase,
            quantity: l.qty,
            discountAmount: new Decimal(0),
            lineTotal: l.lineTotal,
          })),
        },
      },
    })

    await tx.quote.update({
      where: { id: q.id },
      data: {
        status: 'ACCEPTED',
        decidedAt: new Date(),
        decidedById: input.userId,
        convertedOrderId: order.id,
      },
    })

    await tx.quoteAuditLog.create({
      data: {
        quoteId: q.id,
        action: 'accepted',
        actorId: input.userId,
        payload: { orderId: order.id },
      },
    })

    if (orderStatus === 'CONFIRMED' && input.paymentMethod === 'NET_TERMS') {
      await createInvoiceFromOrder(order.id, tx)
    }

    if (needsApproval) {
      await requestApproval({
        organizationId: q.organizationId,
        subjectType: 'ORDER',
        subjectId: order.id,
        amount: order.total,
        requestedById: input.userId,
      })
    }

    return { orderId: order.id, status: orderStatus }
  })
}
