import { pricingService } from '@/modules/pricing'
import { cartRepository } from './repository'
import {
  type AddCartItemInput,
  type UpdateQuantityInput,
  addCartItemSchema,
  updateQuantitySchema,
} from './schemas'

export const cartService = {
  async get(userId: string) {
    return cartRepository.getOrCreateCart(userId)
  },

  async addItem(input: AddCartItemInput) {
    const { userId, productId, quantity, orgId } = addCartItemSchema.parse(input)
    // Onboarding B2B (2026-06-02): defensa en profundidad. Sólo orgs VERIFIED
    // pueden agregar al carrito; el botón también se oculta en el storefront.
    const { isVerified } = await import('@/modules/verification')
    if (!(await isVerified(orgId))) throw new Error('ORG_NOT_VERIFIED')
    const cart = await cartRepository.getOrCreateCart(userId)
    const unitPriceSnapshot = await pricingService.resolveForOrg(orgId, productId)
    await cartRepository.upsertItem(cart.id, productId, quantity, unitPriceSnapshot)
    return cartRepository.getOrCreateCart(userId)
  },

  async updateQuantity(input: UpdateQuantityInput) {
    const { userId, productId, quantity } = updateQuantitySchema.parse(input)
    const cart = await cartRepository.getOrCreateCart(userId)
    if (quantity === 0) {
      await cartRepository.removeItem(cart.id, productId)
    } else {
      await cartRepository.updateQuantity(cart.id, productId, quantity)
    }
    return cartRepository.getOrCreateCart(userId)
  },

  async removeItem(userId: string, productId: string) {
    const cart = await cartRepository.getOrCreateCart(userId)
    await cartRepository.removeItem(cart.id, productId)
    return cartRepository.getOrCreateCart(userId)
  },

  async clear(userId: string) {
    const cart = await cartRepository.getOrCreateCart(userId)
    await cartRepository.clearCart(cart.id)
    return cartRepository.getOrCreateCart(userId)
  },
}
