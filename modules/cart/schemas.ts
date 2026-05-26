import { z } from 'zod'

export const addCartItemSchema = z.object({
  userId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
  orgId: z.string().cuid(),
})

export const updateQuantitySchema = z.object({
  userId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().int().min(0),
})

export type AddCartItemInput = z.infer<typeof addCartItemSchema>
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>
