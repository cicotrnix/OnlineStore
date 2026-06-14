import { ProductCard } from '@/components/commerce/ProductCard'
import { getProductCardContext } from '@/lib/catalog/card-context'
import { prisma } from '@/lib/db/client'
import { filterForOrg } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import type { Category, Product } from '@prisma/client'

export async function FeaturedGrid({ limit = 8 }: { limit?: number }) {
  const ctx = await getProductCardContext()

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isPrivate: false,
      category: { isPrivate: false },
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: limit * 2,
  })

  const visible = ctx.orgId
    ? await filterForOrg(ctx.orgId, products as (Product & { category: Category })[])
    : products
  const final = visible.slice(0, limit)

  if (final.length === 0) return null

  const customerPrices = ctx.orgId
    ? await pricingService.batchResolveForOrg(
        ctx.orgId,
        final.map((p) => p.id)
      )
    : new Map()

  return (
    <section aria-labelledby="featured-heading" className="mt-16">
      <h2 id="featured-heading" className="text-xl font-medium tracking-tight">
        Productos destacados
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {final.map((p) => (
          <li key={p.id}>
            <ProductCard
              product={p}
              customerPrice={customerPrices.get(p.id)}
              currency={ctx.currency}
              canAddToCart={ctx.canAddToCart}
              locale={ctx.locale}
              returnTo="/"
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
