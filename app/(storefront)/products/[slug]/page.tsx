import { AddToQuoteButton } from '@/components/commerce/AddToQuoteButton'
import { AttributeChips } from '@/components/commerce/AttributeChips'
import { MarkdownContent } from '@/components/commerce/MarkdownContent'
import { PriceTierTable } from '@/components/commerce/PriceTierTable'
import { ProductBuyBox } from '@/components/commerce/ProductBuyBox'
import { RelatedProducts } from '@/components/commerce/RelatedProducts'
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-8 md:gap-12 lg:grid-cols-2">
        {/* Hero: una imagen instrument-grade + chips de atributo overlaid (igual que el card). */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <AttributeChips
            attributes={product.attributes}
            categorySlug={product.category.slug}
            locale={locale}
            className="absolute left-3 top-3 z-10"
          />
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-contain p-6"
            />
          ) : (
            <span className="text-sm text-gray-500">{t(locale, 'pdp.noImage')}</span>
          )}
        </div>

        {/* Buy box */}
        <div>
          <ProductBuyBox
            product={product}
            shortDescription={content?.shortDescription}
            customerPrice={showOverride ? customerPrice : null}
            currency={getStoreConfig().currency.base}
            locale={locale}
            showPrice={showPrice}
            canAddToCart={!isImpersonating}
            disabledReason={
              isImpersonating
                ? t(locale, 'pdp.disabled.impersonating')
                : product.stockQuantity === 0
                  ? t(locale, 'pdp.disabled.outOfStock')
                  : undefined
            }
            signInLabel={t(locale, 'pdp.signInForPriceLong')}
          />
          {showRfq && (
            <div className="mt-3">
              <AddToQuoteButton productId={product.id} locale={locale} />
            </div>
          )}
          {showPrivateBadge && (
            <div className="mt-3">
              <Badge variant="info">{t(locale, 'pdp.privateBadge')}</Badge>
            </div>
          )}
          {/* Selling point "Back to 100%": la celda + tag-on flex reusa el
              circuito Apple original → iOS sigue mostrando la salud, sin aviso
              de "Pieza desconocida" (matiz: para una celda BIEN instalada). */}
          {product.category.slug === 'battery-cell' && (
            <div className="mt-6 rounded-xl border border-lime-200 bg-lime-50/60 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {t(locale, 'pdp.batteryHealth.title')}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {t(locale, 'pdp.batteryHealth.body')}
              </p>
            </div>
          )}
          {/* Disclaimers de punto de venta (bajo el botón de compra): aftermarket/
              no-Apple, instalación por técnico, Extended Capacity sin %, garantía
              12 meses. NO incluye el aviso iOS "Pieza desconocida" (no aplica a celdas). */}
          <p className="mt-6 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
            {t(locale, 'pdp.disclaimers')}
          </p>
        </div>
      </div>

      {/* Below-fold full-width: descripción AI (markdown) → tier table → related. */}
      {(content?.longDescriptionMd || product.description) && (
        <MarkdownContent
          markdown={content?.longDescriptionMd || product.description || ''}
          className="mt-12 max-w-3xl"
        />
      )}
      <PriceTierTable tiers={tiers} currency={getStoreConfig().currency.base} locale={locale} />
      <RelatedProducts title={relatedTitle} products={related} />
    </div>
  )
}
