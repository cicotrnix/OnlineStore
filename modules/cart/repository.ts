import { prisma } from '@/lib/db/client'
import type { Decimal } from '@prisma/client/runtime/library'

export const cartRepository = {
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true }, orderBy: { createdAt: 'asc' } } },
    })
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true }, orderBy: { createdAt: 'asc' } } },
      })
    }
    return cart
  },

  async upsertItem(
    cartId: string,
    productId: string,
    quantity: number,
    unitPriceSnapshot: Decimal
  ) {
    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity, unitPriceSnapshot },
      update: { quantity, unitPriceSnapshot },
    })
  },

  async updateQuantity(cartId: string, productId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    })
  },

  async removeItem(cartId: string, productId: string) {
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId, productId } },
    })
  },

  async clearCart(cartId: string) {
    return prisma.cartItem.deleteMany({ where: { cartId } })
  },
}
