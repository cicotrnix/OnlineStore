import { prisma } from '@/lib/db/client'

export const pricingRepository = {
  async findActiveOverride(orgId: string, productId: string) {
    const now = new Date()
    return prisma.customerPrice.findFirst({
      where: {
        organizationId: orgId,
        productId,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
    })
  },

  async findActiveOverridesForProducts(orgId: string, productIds: string[]) {
    const now = new Date()
    return prisma.customerPrice.findMany({
      where: {
        organizationId: orgId,
        productId: { in: productIds },
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
    })
  },

  async getProductBasePrice(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { basePrice: true },
    })
  },

  async getProductsBasePrices(productIds: string[]) {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, basePrice: true },
    })
  },

  async upsertCustomerPrice(input: {
    organizationId: string
    productId: string
    price: import('@prisma/client/runtime/library').Decimal
    validFrom?: Date | null
    validUntil?: Date | null
    notes?: string | null
  }) {
    return prisma.customerPrice.upsert({
      where: {
        organizationId_productId: {
          organizationId: input.organizationId,
          productId: input.productId,
        },
      },
      create: {
        organizationId: input.organizationId,
        productId: input.productId,
        price: input.price,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        notes: input.notes ?? null,
      },
      update: {
        price: input.price,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        notes: input.notes ?? null,
      },
    })
  },

  async listForOrg(orgId: string) {
    return prisma.customerPrice.findMany({
      where: { organizationId: orgId },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    })
  },
}
