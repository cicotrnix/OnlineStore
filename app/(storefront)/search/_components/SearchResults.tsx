import { ProductCard } from '@/components/commerce/ProductCard'
import { getProductCardContext } from '@/lib/catalog/card-context'
import { pricingService } from '@/modules/pricing'
import type { Category, Product } from '@prisma/client'
import Link from 'next/link'

type Props = {
  hits: (Product & { category: Category })[]
}

export async function SearchResults({ hits }: Props) {
  if (hits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-600">No encontramos productos para tu búsqueda.</p>
        <p className="mt-2 text-sm">
          Probá términos más generales o{' '}
          <Link href="/catalog" className="text-gray-900 underline">
            ver el catálogo completo
          </Link>
          .
        </p>
      </div>
    )
  }

  const ctx = await getProductCardContext()
  const customerPrices = ctx.orgId
    ? await pricingService.batchResolveForOrg(
        ctx.orgId,
        hits.map((p) => p.id)
      )
    : new Map()

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((p) => (
        <li key={p.id}>
          <ProductCard
            product={p}
            customerPrice={customerPrices.get(p.id)}
            currency={ctx.currency}
            canAddToCart={ctx.canAddToCart}
            locale={ctx.locale}
            returnTo="/search"
            disabledReason={ctx.disabledReason}
            showPrice={ctx.showPrice}
            signInLinkLabel={ctx.signInLinkLabel}
          />
        </li>
      ))}
    </ul>
  )
}
