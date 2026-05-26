import { Decimal } from '@prisma/client/runtime/library'
import { catalogRepository } from './repository'
import {
  type CreateCategoryInput,
  type CreateProductInput,
  type UpdateCategoryInput,
  type UpdateProductInput,
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema,
} from './schemas'

export const catalogService = {
  async createCategory(input: CreateCategoryInput) {
    const data = createCategorySchema.parse(input)
    return catalogRepository.createCategory(data)
  },

  async updateCategory(input: UpdateCategoryInput) {
    const { id, ...data } = updateCategorySchema.parse(input)
    return catalogRepository.updateCategory(id, data)
  },

  async listCategories(activeOnly = true) {
    return catalogRepository.listCategories(activeOnly)
  },

  async findCategoryBySlug(slug: string) {
    return catalogRepository.findCategoryBySlug(slug)
  },

  async createProduct(input: CreateProductInput) {
    const data = createProductSchema.parse(input)
    const { categoryId, basePrice, ...rest } = data
    return catalogRepository.createProduct({
      ...rest,
      basePrice: new Decimal(basePrice),
      category: { connect: { id: categoryId } },
    })
  },

  async updateProduct(input: UpdateProductInput) {
    const { id, basePrice, categoryId, ...rest } = updateProductSchema.parse(input)
    return catalogRepository.updateProduct(id, {
      ...rest,
      ...(basePrice !== undefined ? { basePrice: new Decimal(basePrice) } : {}),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    })
  },

  async listProducts(opts: {
    categoryId?: string
    activeOnly?: boolean
    take?: number
    skip?: number
  }) {
    return catalogRepository.listProducts(opts)
  },

  async countProducts(opts: { categoryId?: string; activeOnly?: boolean } = {}) {
    return catalogRepository.countProducts(opts)
  },

  async findProductBySlug(slug: string) {
    return catalogRepository.findProductBySlug(slug)
  },

  async findProductById(id: string) {
    return catalogRepository.findProductById(id)
  },
}
