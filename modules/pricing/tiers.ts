import { prisma } from '@/lib/db/client'
import type { ProductPriceTier } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface TierInput {
  productId: string
  minQty: number
  unitPrice: number | string | Decimal
}

export async function upsertTier(input: TierInput): Promise<ProductPriceTier> {
  if (input.minQty <= 0) throw new Error('minQty must be > 0')
  const price = new Decimal(input.unitPrice as Decimal.Value)
  if (price.lte(0)) throw new Error('unitPrice must be > 0')

  return prisma.productPriceTier.upsert({
    where: { productId_minQty: { productId: input.productId, minQty: input.minQty } },
    create: { productId: input.productId, minQty: input.minQty, unitPrice: price },
    update: { unitPrice: price },
  })
}

export async function listTiersForProduct(productId: string): Promise<ProductPriceTier[]> {
  return prisma.productPriceTier.findMany({
    where: { productId },
    orderBy: { minQty: 'asc' },
  })
}

export async function deleteTier(id: string): Promise<void> {
  await prisma.productPriceTier.delete({ where: { id } })
}
