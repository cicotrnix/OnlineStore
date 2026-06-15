import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { Decimal } from '@prisma/client/runtime/library'
import Image from 'next/image'
import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { AttributeChips } from './AttributeChips'
import { NotifyButton } from './NotifyButton'
import { PriceTag } from './PriceTag'
import { STOCK_DOT, deriveStockState, stockLabel } from './product-display'

type Product = {
  id: string
  slug: string
  sku: string
  name: string
  imageUrl: string | null
  basePrice: Decimal
  stockQuantity: number
  attributes?: unknown
  category?: { slug: string } | null
}

type Props = {
  product: Product
  customerPrice?: Decimal | null
  currency: string
  canAddToCart: boolean
  locale: Locale
  disabledReason?: string
  /** Onboarding B2B: si false, oculta precio y muestra CTA "registrate para ver precios". */
  showPrice?: boolean
  signInLinkLabel?: string
  noImageLabel?: string
  /** Path para retornar tras Add (toast). Default: `/catalog`. */
  returnTo?: string
}

/** Quita del nombre del proveedor el sufijo "(Spot Welding Required)" — el chip ya lo dice. */
function cleanName(name: string): string {
  return name.replace(/\s*\(spot welding required\)\s*/gi, ' ').trim()
}

export function ProductCard({
  product,
  customerPrice,
  currency,
  canAddToCart,
  locale,
  disabledReason,
  showPrice = true,
  signInLinkLabel = 'Sign in to see prices →',
  noImageLabel = 'No image',
  returnTo,
}: Props) {
  const stockState = deriveStockState(product.stockQuantity, product.attributes)
  const needsNotify = stockState === 'incoming' || stockState === 'coming_soon'

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link
        href={`/products/${product.slug}`}
        className="relative flex aspect-square items-center justify-center overflow-hidden bg-gray-50"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-contain p-4"
          />
        ) : (
          <span className="text-xs text-gray-500">{noImageLabel}</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <AttributeChips
          attributes={product.attributes}
          categorySlug={product.category?.slug ?? null}
          locale={locale}
        />

        <div>
          <div className="font-mono text-[10px] uppercase tracking-wide text-gray-500">
            {product.sku}
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="mt-1 block line-clamp-2 text-sm font-medium text-gray-900 hover:underline"
          >
            {cleanName(product.name)}
          </Link>
        </div>

        {/* incoming/coming_soon NO muestran precio (el 0.00 placeholder nunca se ve). */}
        {!needsNotify &&
          (showPrice ? (
            <PriceTag
              basePrice={product.basePrice}
              customerPrice={customerPrice}
              currency={currency}
            />
          ) : (
            <Link href="/sign-in" className="text-sm font-medium text-lime-700 hover:underline">
              {signInLinkLabel}
            </Link>
          ))}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`h-2 w-2 rounded-full ${STOCK_DOT[stockState]}`} aria-hidden="true" />
            {stockLabel(stockState, locale)}
          </span>
          {needsNotify ? (
            <NotifyButton productName={product.name} label={t(locale, 'catalog.notify')} />
          ) : showPrice ? (
            <AddToCartButton
              productId={product.id}
              locale={locale}
              returnTo={returnTo}
              showQuantity
              disabled={!canAddToCart || stockState !== 'in_stock'}
              disabledReason={disabledReason}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}
