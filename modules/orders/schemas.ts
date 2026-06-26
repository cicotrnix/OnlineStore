import { TERMS_VERSION } from '@/lib/legal'
import { z } from 'zod'

export const placeOrderSchema = z.object({
  userId: z.string().cuid(),
  orgId: z.string().cuid(),
  billingAddressId: z.string().cuid(),
  shippingAddressId: z.string().cuid(),
  poNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  // Versión de términos aceptada por el comprador. El gate de aceptación vive
  // en checkout.confirm (server-side); aquí se persiste como prueba en la orden.
  termsVersion: z.string().min(1).default(TERMS_VERSION),
})

export const transitionStatusSchema = z.object({
  orderId: z.string().cuid(),
  newStatus: z.enum(['CONFIRMED', 'SHIPPED', 'DELIVERED']),
})

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>
