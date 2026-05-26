import { z } from 'zod'

const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'Must be lowercase letters, numbers, and hyphens')
  .min(1)
  .max(80)
const sku = z
  .string()
  .regex(/^[A-Z0-9-]+$/, 'Must be uppercase letters, numbers, and hyphens')
  .min(1)
  .max(40)

export const createCategorySchema = z.object({
  slug,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().cuid(),
})

export const createProductSchema = z.object({
  sku,
  slug,
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  basePrice: z.number().positive().multipleOf(0.01),
  stockQuantity: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().cuid(),
  isActive: z.boolean().default(true),
})

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().cuid(),
})

export type CreateCategoryInput = z.input<typeof createCategorySchema>
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>
export type CreateProductInput = z.input<typeof createProductSchema>
export type UpdateProductInput = z.input<typeof updateProductSchema>
