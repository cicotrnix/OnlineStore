import { getProductCardContext } from '@/lib/catalog/card-context'
import { pricingService } from '@/modules/pricing'
import type { Category, Product } from '@prisma/client'
import { ProductCard } from './ProductCard'

type Props = {
  title: string
  products: (Product & { category: Category })[]
}

export async function RelatedProducts({ title, products }: Props) {
  if (products.length === 0) return null

  const ctx = await getProductCardContext()
  const customerPrices = ctx.orgId
    ? await pricingService.batchResolveForOrg(
        ctx.orgId,
        products.map((p) => p.id)
      )
    : new Map()

  return (
    <section aria-labelledby="related-heading" className="mt-12 md:col-span-2">
      <h2 id="related-heading" className="text-lg font-medium tracking-tight">
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard
              product={p}
              customerPrice={customerPrices.get(p.id)}
              currency={ctx.currency}
              canAddToCart={ctx.canAddToCart}
              locale={ctx.locale}
              disabledReason={ctx.disabledReason}
              showPrice={ctx.showPrice}
              signInLinkLabel={ctx.signInLinkLabel}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
