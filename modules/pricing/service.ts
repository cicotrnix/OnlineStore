import { Decimal } from '@prisma/client/runtime/library'
import { pricingRepository } from './repository'
import { type SetCustomerPriceInput, setCustomerPriceSchema } from './schemas'

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
}
