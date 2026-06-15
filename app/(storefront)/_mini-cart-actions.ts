'use server'

import type { CartLineItem } from '@/components/commerce/CartLine'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { addMoney, formatMoney, multiplyMoney } from '@/lib/money'
import { cartService } from '@/modules/cart'
import { getStoreConfig } from '@/stores'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

export type MiniCartData = {
  items: CartLineItem[]
  subtotalFormatted: string
  count: number
}

async function buildMiniCart(userId: string): Promise<MiniCartData> {
  const cart = await cartService.get(userId)
  const currency = getStoreConfig().currency.base
  const items: CartLineItem[] = cart.items.map((it) => ({
    productId: it.product.id,
    slug: it.product.slug,
    sku: it.product.sku,
    name: it.product.name,
    imageUrl: it.product.imageUrl,
    isActive: it.product.isActive,
    quantity: it.quantity,
    unitPrice: formatMoney(it.unitPriceSnapshot, currency),
    lineTotal: formatMoney(multiplyMoney(it.unitPriceSnapshot, it.quantity), currency),
  }))
  const subtotal =
    cart.items.length > 0
      ? addMoney(...cart.items.map((it) => multiplyMoney(it.unitPriceSnapshot, it.quantity)))
      : new Decimal(0)
  return {
    items,
    subtotalFormatted: formatMoney(subtotal, currency),
    count: items.reduce((acc, i) => acc + i.quantity, 0),
  }
}

/** Lazy: trae los ítems al abrir el drawer. Gateado por verificación (#5). */
export async function getMiniCart(): Promise<MiniCartData> {
  const customer = await requireVerifiedCustomer()
  return buildMiniCart(customer.userId)
}

/** Edición inline desde el drawer: NO redirige, devuelve el carrito actualizado. */
export async function miniCartSetQuantity(
  productId: string,
  quantity: number
): Promise<MiniCartData> {
  const customer = await requireVerifiedCustomer()
  await cartService.updateQuantity({ userId: customer.userId, productId, quantity })
  revalidatePath('/cart')
  revalidatePath('/', 'layout')
  return buildMiniCart(customer.userId)
}

export async function miniCartRemove(productId: string): Promise<MiniCartData> {
  const customer = await requireVerifiedCustomer()
  await cartService.removeItem(customer.userId, productId)
  revalidatePath('/cart')
  revalidatePath('/', 'layout')
  return buildMiniCart(customer.userId)
}
