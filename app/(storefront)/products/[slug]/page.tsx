import { AddToCartButton } from '@/components/commerce/AddToCartButton'
import { AddToQuoteButton } from '@/components/commerce/AddToQuoteButton'
import { PriceTag } from '@/components/commerce/PriceTag'
import { PriceTierTable } from '@/components/commerce/PriceTierTable'
import { RelatedProducts } from '@/components/commerce/RelatedProducts'
import { StockBadge } from '@/components/commerce/StockBadge'
import { Badge } from '@/components/ui/Badge'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { DEFAULT_LOCALE, getLocale } from '@/lib/i18n'
import { getPersonalizedRecommendations, getRelatedProducts } from '@/modules/ai/recommendations'
import { catalogService } from '@/modules/catalog'
import { listTiersForProduct, pricingService } from '@/modules/pricing'
import { getStoreConfig } from '@/stores'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

async function loadPublishedContent(productId: string, userId: string | null) {
  const locale = await getLocale({ userId })
  const primary = await prisma.productContent.findFirst({
    where: { productId, locale, status: 'PUBLISHED' },
  })
  if (primary) return primary
  if (locale === DEFAULT_LOCALE) return null
  return prisma.productContent.findFirst({
    where: { productId, locale: DEFAULT_LOCALE, status: 'PUBLISHED' },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const product = await catalogService.findProductBySlugVisible(orgId, slug)
  if (!product) return {}
  const content = await loadPublishedContent(product.id, session?.user?.id ?? null)
  return {
    title: content?.seoTitle || product.name,
    description: content?.seoDescription || product.description || undefined,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  // Onboarding B2B (2026-06-02): solo orgs VERIFIED ven precio + botón comprar.
  // PDP queda público (SEO) — el anónimo ve specs/contenido sin precio.
  const { getCustomerState } = await import('@/lib/auth/customer')
  const customerState = await getCustomerState()
  const { getLocale, t } = await import('@/lib/i18n')
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  const verifiedOrgId = customerState.kind === 'verified' ? customerState.orgId : null
  const orgId = verifiedOrgId
  const isImpersonating = customerState.kind === 'verified' ? customerState.isImpersonating : false
  const showPrice = customerState.kind === 'verified'
  const product = await catalogService.findProductBySlugVisible(orgId, slug)
  if (!product || !product.isActive) notFound()
  const customerPrice = orgId ? await pricingService.resolveForOrg(orgId, product.id) : null
  const showOverride = customerPrice && !customerPrice.equals(product.basePrice)
  const tiers = isFeatureEnabled('volumeDiscounts') ? await listTiersForProduct(product.id) : []
  const showRfq = isFeatureEnabled('rfq') && !!session?.user && !isImpersonating
  const showPrivateBadge = isFeatureEnabled('privateCatalogs') && product.isPrivate
  const content = await loadPublishedContent(product.id, session?.user?.id ?? null)
  const isTagOn =
    product.attributes &&
    typeof product.attributes === 'object' &&
    (product.attributes as Record<string, unknown>).flex_included === 'tag-on'

  const personalized =
    getStoreConfig().ai.recommendations && session?.user?.id
      ? await getPersonalizedRecommendations({
          userId: session.user.id,
          orgId,
          limit: 8,
        }).catch(() => [])
      : []
  const related = getStoreConfig().ai.recommendations
    ? personalized.length > 0
      ? personalized
      : await getRelatedProducts({ productId: product.id, orgId, limit: 8 }).catch(() => [])
    : []
  const relatedTitle =
    personalized.length > 0
      ? t(locale, 'pdp.relatedTitle.recommended')
      : t(locale, 'pdp.relatedTitle.related')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid gap-10 md:grid-cols-2">
      <div className="relative aspect-square bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover"
          />
        ) : (
          <span className="text-sm text-gray-400">{t(locale, 'pdp.noImage')}</span>
        )}
      </div>
      <div>
        <Link
          href={`/catalog?category=${product.category.slug}`}
          className="text-xs uppercase tracking-wide text-gray-500 hover:underline"
        >
          {product.category.name}
        </Link>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">{product.name}</h1>
        <p className="mt-1 text-xs text-gray-500 font-mono">
          {t(locale, 'pdp.viewLabel.sku')} {product.sku}
        </p>
        {isTagOn && (
          <div className="mt-2">
            <Badge variant="info">Tag-On Flex</Badge>
          </div>
        )}
        {content?.shortDescription && (
          <p className="mt-3 text-sm text-gray-700">{content.shortDescription}</p>
        )}

        <div className="mt-5">
          {showPrice ? (
            <PriceTag
              basePrice={product.basePrice}
              customerPrice={showOverride ? customerPrice : null}
              currency={getStoreConfig().currency.base}
              size="lg"
            />
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              {t(locale, 'pdp.signInForPriceLong')}
            </Link>
          )}
        </div>

        <div className="mt-3">
          <StockBadge stockQuantity={product.stockQuantity} />
        </div>

        {content?.longDescriptionMd ? (
          <div className="mt-6 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {content.longDescriptionMd}
          </div>
        ) : product.description ? (
          <div className="mt-6 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {product.description}
          </div>
        ) : null}

        <div className="mt-8">
          {showPrice && (
            <AddToCartButton
              productId={product.id}
              locale={locale}
              returnTo={`/products/${product.slug}`}
              showQuantity
              disabled={isImpersonating || product.stockQuantity === 0}
              disabledReason={
                isImpersonating
                  ? t(locale, 'pdp.disabled.impersonating')
                  : product.stockQuantity === 0
                    ? t(locale, 'pdp.disabled.outOfStock')
                    : undefined
              }
            />
          )}
          {showRfq && (
            <div className="mt-3">
              <AddToQuoteButton productId={product.id} />
            </div>
          )}
          {showPrivateBadge && (
            <div className="mt-3">
              <Badge variant="info">{t(locale, 'pdp.privateBadge')}</Badge>
            </div>
          )}
        </div>
        {tiers.length > 0 && (
          <div className="md:col-span-2">
            <PriceTierTable tiers={tiers} currency={getStoreConfig().currency.base} />
          </div>
        )}
      </div>
      <RelatedProducts title={relatedTitle} products={related} signedIn={!!session?.user} />
    </div>
  )
}
