import {
  catalogService,
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema,
} from '@/modules/catalog'
import { z } from 'zod'
import { adminProcedure, publicProcedure, router } from '../server'

export const catalogRouter = router({
  listCategories: publicProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(({ input }) => catalogService.listCategories(input?.activeOnly ?? true)),

  listProducts: publicProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        activeOnly: z.boolean().optional(),
        take: z.number().int().min(1).max(100).optional(),
        skip: z.number().int().min(0).optional(),
      })
    )
    .query(({ input }) => catalogService.listProducts(input)),

  productBySlug: publicProcedure
    .input(z.string())
    .query(({ input }) => catalogService.findProductBySlug(input)),

  createCategory: adminProcedure
    .input(createCategorySchema)
    .mutation(({ input }) => catalogService.createCategory(input)),
  updateCategory: adminProcedure
    .input(updateCategorySchema)
    .mutation(({ input }) => catalogService.updateCategory(input)),
  createProduct: adminProcedure
    .input(createProductSchema)
    .mutation(({ input }) => catalogService.createProduct(input)),
  updateProduct: adminProcedure
    .input(updateProductSchema)
    .mutation(({ input }) => catalogService.updateProduct(input)),
})
