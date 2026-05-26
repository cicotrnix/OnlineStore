import { cartService } from '@/modules/cart'
import { ordersService } from '@/modules/orders'
import { pricingService } from '@/modules/pricing'
import {
  type ConfirmCheckoutInput,
  type ReviewCheckoutInput,
  confirmCheckoutSchema,
  reviewCheckoutSchema,
} from './schemas'

export type CheckoutIssue = 'empty' | 'inactive' | 'insufficient-stock' | 'price-changed'

export type ReviewedItem = {
  productId: string
  name: string
  sku: string
  quantity: number
  snapshotPrice: string
  currentPrice: string
  availableStock: number
  issues: CheckoutIssue[]
}

export type CheckoutReview = {
  items: ReviewedItem[]
  subtotalSnapshot: string
  subtotalCurrent: string
  issues: CheckoutIssue[]
}

export const checkoutService = {
  async review(input: ReviewCheckoutInput): Promise<CheckoutReview> {
    const { userId, orgId } = reviewCheckoutSchema.parse(input)
    const cart = await cartService.get(userId)
    if (cart.items.length === 0) {
      return { items: [], subtotalSnapshot: '0', subtotalCurrent: '0', issues: ['empty'] }
    }

    const allIssues = new Set<CheckoutIssue>()
    const reviewedItems: ReviewedItem[] = []
    let subtotalSnap = 0
    let subtotalCur = 0

    for (const item of cart.items) {
      const itemIssues: CheckoutIssue[] = []
      if (!item.product.isActive) itemIssues.push('inactive')
      if (item.product.stockQuantity < item.quantity) itemIssues.push('insufficient-stock')
      const currentPrice = await pricingService.resolveForOrg(orgId, item.product.id)
      if (!currentPrice.equals(item.unitPriceSnapshot)) itemIssues.push('price-changed')

      reviewedItems.push({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        snapshotPrice: item.unitPriceSnapshot.toString(),
        currentPrice: currentPrice.toString(),
        availableStock: item.product.stockQuantity,
        issues: itemIssues,
      })
      for (const issue of itemIssues) allIssues.add(issue)
      subtotalSnap += item.unitPriceSnapshot.toNumber() * item.quantity
      subtotalCur += currentPrice.toNumber() * item.quantity
    }

    return {
      items: reviewedItems,
      subtotalSnapshot: subtotalSnap.toFixed(2),
      subtotalCurrent: subtotalCur.toFixed(2),
      issues: Array.from(allIssues),
    }
  },

  async confirm(input: ConfirmCheckoutInput) {
    const parsed = confirmCheckoutSchema.parse(input)
    return ordersService.placeOrder({
      userId: parsed.userId,
      orgId: parsed.orgId,
      billingAddressId: parsed.billingAddressId,
      shippingAddressId: parsed.shippingAddressId,
      poNumber: parsed.poNumber,
      notes: parsed.notes,
    })
  },
}
