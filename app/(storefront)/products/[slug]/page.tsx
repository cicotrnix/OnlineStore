import { AddToCartButton } from '@/components/commerce/AddToCartButton'
import { AddToQuoteButton } from '@/components/commerce/AddToQuoteButton'
import { PriceTag } from '@/components/commerce/PriceTag'
import { PriceTierTable } from '@/components/commerce/PriceTierTable'
import { StockBadge } from '@/components/commerce/StockBadge'
import { Badge } from '@/components/ui/Badge'
import { auth } from '@/lib/auth/config'
import { isFeatureEnabled } from '@/lib/features'
import { catalogService } from '@/modules/catalog'
import { listTiersForProduct, pricingService } from '@/modules/pricing'
import storeConfig from '@/store.config'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await catalogService.findProductBySlug(slug)
  if (!product || !product.isActive) notFound()

  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const isImpersonating = !!session?.impersonatingOrgId
  const customerPrice = orgId ? await pricingService.resolveForOrg(orgId, product.id) : null
  const showOverride = customerPrice && !customerPrice.equals(product.basePrice)
  const tiers = isFeatureEnabled('volumeDiscounts') ? await listTiersForProduct(product.id) : []
  const showRfq = isFeatureEnabled('rfq') && !!session?.user && !isImpersonating
  const showPrivateBadge = isFeatureEnabled('privateCatalogs') && product.isPrivate

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid gap-10 md:grid-cols-2">
      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm text-gray-400">Sin imagen</span>
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
        <p className="mt-1 text-xs text-gray-500 font-mono">SKU {product.sku}</p>

        <div className="mt-5">
          <PriceTag
            basePrice={product.basePrice}
            customerPrice={showOverride ? customerPrice : null}
            currency={storeConfig.currency.base}
            size="lg"
          />
        </div>

        <div className="mt-3">
          <StockBadge stockQuantity={product.stockQuantity} />
        </div>

        {product.description && (
          <div className="mt-6 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {product.description}
          </div>
        )}

        <div className="mt-8">
          <AddToCartButton
            productId={product.id}
            showQuantity
            disabled={!session?.user || isImpersonating || product.stockQuantity === 0}
            disabledReason={
              isImpersonating
                ? 'No puedes colocar órdenes mientras impersonas'
                : !session?.user
                  ? 'Inicia sesión para comprar'
                  : product.stockQuantity === 0
                    ? 'Agotado'
                    : undefined
            }
          />
          {showRfq && (
            <div className="mt-3">
              <AddToQuoteButton productId={product.id} />
            </div>
          )}
          {showPrivateBadge && (
            <div className="mt-3">
              <Badge variant="info">Producto privado para tu organización</Badge>
            </div>
          )}
        </div>
        {tiers.length > 0 && (
          <div className="md:col-span-2">
            <PriceTierTable tiers={tiers} currency={storeConfig.currency.base} />
          </div>
        )}
      </div>
    </div>
  )
}
