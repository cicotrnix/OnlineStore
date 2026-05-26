import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { Decimal } from '@prisma/client/runtime/library'
import { pricingRepository } from './repository'
import { type SetCustomerPriceInput, setCustomerPriceSchema } from './schemas'

export interface ResolvedPrice {
  unitPrice: Decimal
  discountAmount: Decimal
}

export const pricingService = {
  async resolveForOrg(orgId: string, productId: string): Promise<Decimal> {
    const override = await pricingRepository.findActiveOverride(orgId, productId)
    if (override) return override.price

    const product = await pricingRepository.getProductBasePrice(productId)
    if (!product) throw new Error(`Product not found: ${productId}`)
    return product.basePrice
  },

  async batchResolveForOrg(orgId: string, productIds: string[]): Promise<Map<string, Decimal>> {
    const [overrides, products] = await Promise.all([
      pricingRepository.findActiveOverridesForProducts(orgId, productIds),
      pricingRepository.getProductsBasePrices(productIds),
    ])

    const overridesByProductId = new Map(overrides.map((o) => [o.productId, o.price]))
    const result = new Map<string, Decimal>()
    for (const product of products) {
      const override = overridesByProductId.get(product.id)
      result.set(product.id, override ?? product.basePrice)
    }
    return result
  },

  async setCustomerPrice(input: SetCustomerPriceInput) {
    const parsed = setCustomerPriceSchema.parse(input)
    return pricingRepository.upsertCustomerPrice({
      organizationId: parsed.organizationId,
      productId: parsed.productId,
      price: new Decimal(parsed.price),
      validFrom: parsed.validFrom,
      validUntil: parsed.validUntil,
      notes: parsed.notes,
    })
  },

  async listForOrg(orgId: string) {
    return pricingRepository.listForOrg(orgId)
  },

  /**
   * Returns unitPrice (base/customer override) plus discountAmount if a volume tier
   * applies and is cheaper. discountAmount is qty × per-unit-savings, snapshot on CartItem.
   * Feature-gated: when volumeDiscounts is off, returns 0 discount regardless of tiers.
   */
  async resolvePriceWithTiers(
    orgId: string,
    productId: string,
    qty: number
  ): Promise<ResolvedPrice> {
    const [product, customerPrice] = await Promise.all([
      prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { basePrice: true },
      }),
      pricingRepository.findActiveOverride(orgId, productId),
    ])
    const unitPrice: Decimal = customerPrice?.price ?? product.basePrice
    let discountAmount = new Decimal(0)

    if (isFeatureEnabled('volumeDiscounts')) {
      const tier = await prisma.productPriceTier.findFirst({
        where: { productId, minQty: { lte: qty } },
        orderBy: { minQty: 'desc' },
      })
      if (tier?.unitPrice.lt(unitPrice)) {
        discountAmount = unitPrice.sub(tier.unitPrice).mul(qty)
      }
    }

    return { unitPrice, discountAmount }
  },
}
