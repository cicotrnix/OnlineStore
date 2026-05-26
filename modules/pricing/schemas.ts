import { z } from 'zod'

export const setCustomerPriceSchema = z.object({
  organizationId: z.string().cuid(),
  productId: z.string().cuid(),
  price: z.number().positive().multipleOf(0.01),
  validFrom: z.date().optional().nullable(),
  validUntil: z.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type SetCustomerPriceInput = z.infer<typeof setCustomerPriceSchema>
