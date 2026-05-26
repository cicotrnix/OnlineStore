import { CatalogToggle } from '@/components/commerce/CatalogToggle'
import { ProductCard } from '@/components/commerce/ProductCard'
import { ProductListRow } from '@/components/commerce/ProductListRow'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { catalogService } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import storeConfig from '@/store.config'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{ category?: string }>
}

export default async function CatalogPage({ searchParams }: Props) {
  const session = await auth()
  const params = await searchParams
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const isImpersonating = !!session?.impersonatingOrgId

  const view: 'CARDS' | 'LIST' = await (async () => {
    if (!session?.user?.id) return 'CARDS'
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferredCatalogView: true },
    })
    return u?.preferredCatalogView ?? 'CARDS'
  })()

  const categories = await catalogService.listCategories()
  const activeCat = params.category
    ? await catalogService.findCategoryBySlug(params.category)
    : null
  const products = await catalogService.listProducts({
    categoryId: activeCat?.id,
    activeOnly: true,
    take: 50,
  })

  const customerPrices = orgId
    ? await pricingService.batchResolveForOrg(
        orgId,
        products.map((p) => p.id)
      )
    : new Map()

  const canAddToCart = !!session?.user && !isImpersonating
  const disabledReason = isImpersonating
    ? 'No puedes colocar órdenes mientras impersonas'
    : !session?.user
      ? 'Inicia sesión para comprar'
      : undefined

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            {activeCat ? activeCat.name : 'Catálogo'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} producto{products.length === 1 ? '' : 's'}
          </p>
        </div>
        <CatalogToggle current={view} />
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/catalog"
          className={`rounded-full border px-3 py-1 text-xs ${
            !activeCat
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          Todos
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/catalog?category=${c.slug}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeCat?.id === c.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-sm text-gray-500">No hay productos disponibles.</p>
      ) : view === 'CARDS' ? (
        <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              customerPrice={customerPrices.get(p.id)}
              currency={storeConfig.currency.base}
              canAddToCart={canAddToCart}
              disabledReason={disabledReason}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Categoría</th>
                <th className="px-3 py-2 text-left">Stock</th>
                <th className="px-3 py-2 text-left">Precio</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductListRow
                  key={p.id}
                  product={p}
                  customerPrice={customerPrices.get(p.id)}
                  currency={storeConfig.currency.base}
                  canAddToCart={canAddToCart}
                  disabledReason={disabledReason}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
