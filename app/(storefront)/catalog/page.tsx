import { CatalogToggle } from '@/components/commerce/CatalogToggle'
import { ProductCard } from '@/components/commerce/ProductCard'
import { ProductListRow } from '@/components/commerce/ProductListRow'
import { auth } from '@/lib/auth/config'
import { getCustomerState } from '@/lib/auth/customer'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
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
  // Onboarding B2B (2026-06-02): solo orgs VERIFIED ven precio/compra.
  // Catálogo público: anónimo y orgs pending/rejected ven listado sin precio.
  const customerState = await getCustomerState()
  const verifiedOrgId = customerState.kind === 'verified' ? customerState.orgId : null
  const orgId = verifiedOrgId
  const isImpersonating = customerState.kind === 'verified' ? customerState.isImpersonating : false
  const locale = await getLocale({ userId: session?.user?.id ?? null })

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
  const products = await catalogService.listProductsVisible(orgId, {
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

  const canAddToCart = customerState.kind === 'verified' && !isImpersonating
  const disabledReason = isImpersonating
    ? t(locale, 'catalog.disabled.impersonating')
    : customerState.kind === 'anonymous'
      ? t(locale, 'catalog.disabled.anon')
      : customerState.kind === 'no-org'
        ? t(locale, 'catalog.disabled.noOrg')
        : customerState.kind === 'pending'
          ? t(locale, 'catalog.disabled.pending')
          : customerState.kind === 'rejected'
            ? t(locale, 'catalog.disabled.rejected')
            : undefined

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            {activeCat ? activeCat.name : t(locale, 'catalog.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length === 1
              ? t(locale, 'catalog.countOne')
              : t(locale, 'catalog.countMany', { count: products.length })}
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
          {t(locale, 'catalog.allCategories')}
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
        <p className="mt-12 text-center text-sm text-gray-500">{t(locale, 'catalog.empty')}</p>
      ) : view === 'CARDS' ? (
        <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              customerPrice={customerPrices.get(p.id)}
              currency={storeConfig.currency.base}
              canAddToCart={canAddToCart}
              locale={locale}
              returnTo="/catalog"
              disabledReason={disabledReason}
              showPrice={customerState.kind === 'verified'}
              signInLinkLabel={`${t(locale, 'product.signInForPrice')} →`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">{t(locale, 'catalog.tableHead.sku')}</th>
                <th className="px-3 py-2 text-left">{t(locale, 'catalog.tableHead.product')}</th>
                <th className="px-3 py-2 text-left">{t(locale, 'catalog.tableHead.category')}</th>
                <th className="px-3 py-2 text-left">{t(locale, 'catalog.tableHead.stock')}</th>
                <th className="px-3 py-2 text-left">{t(locale, 'catalog.tableHead.price')}</th>
                <th className="px-3 py-2 text-right">{t(locale, 'catalog.tableHead.action')}</th>
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
                  locale={locale}
                  returnTo="/catalog"
                  disabledReason={disabledReason}
                  showPrice={customerState.kind === 'verified'}
                  signInLabel={t(locale, 'catalog.signInLinkShort')}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
