import { prisma } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export const catalogRepository = {
  async createCategory(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data })
  },
  async updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data })
  },
  async deleteCategory(id: string) {
    return prisma.category.delete({ where: { id } })
  },
  async findCategoryBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } })
  },
  async listCategories(activeOnly = true) {
    return prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    })
  },

  async createProduct(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data })
  },
  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data })
  },
  async findProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    })
  },
  async findProductById(id: string) {
    return prisma.product.findUnique({ where: { id } })
  },
  async listProducts(opts: {
    categoryId?: string
    activeOnly?: boolean
    take?: number
    skip?: number
  }) {
    return prisma.product.findMany({
      where: {
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
        ...((opts.activeOnly ?? true) ? { isActive: true } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
    })
  },
  async countProducts(opts: { categoryId?: string; activeOnly?: boolean }) {
    return prisma.product.count({
      where: {
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
        ...((opts.activeOnly ?? true) ? { isActive: true } : {}),
      },
    })
  },
}
