import { z } from 'zod'

export const reviewCheckoutSchema = z.object({
  userId: z.string().cuid(),
  orgId: z.string().cuid(),
})

export const confirmCheckoutSchema = z.object({
  userId: z.string().cuid(),
  orgId: z.string().cuid(),
  billingAddressId: z.string().cuid(),
  shippingAddressId: z.string().cuid(),
  poNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  termsAccepted: z.boolean().optional(),
})

export type ReviewCheckoutInput = z.infer<typeof reviewCheckoutSchema>
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>
