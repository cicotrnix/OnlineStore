import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { Decimal } from '@prisma/client/runtime/library'
import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { NotifyButton } from './NotifyButton'
import { PriceTag } from './PriceTag'
import { SpecReadout, type SpecRow } from './SpecReadout'
import { STOCK_DOT, deriveStockState, isOrderable, stockLabel } from './product-display'

type BuyBoxProduct = {
  id: string
  slug: string
  sku: string
  name: string
  basePrice: Decimal
  stockQuantity: number
  attributes?: unknown
  category: { name: string; slug: string }
}

type Props = {
  product: BuyBoxProduct
  shortDescription?: string | null
  customerPrice?: Decimal | null
  currency: string
  locale: Locale
  /** verified → muestra precio + comprar; anónimo/pending → CTA de login. */
  showPrice: boolean
  /** verified && !impersonating → puede agregar al carrito. */
  canAddToCart: boolean
  disabledReason?: string
  signInLabel: string
}

/**
 * Buy box de la PDP (above-fold, columna derecha). Reusa los helpers del catálogo
 * (chips/stock/stepper) y el SpecReadout instrumento (2 col; capacity gated por
 * FU-010 — nunca "—" ni dato inventado). Orden: categoría · SKU → nombre →
 * short desc → SpecReadout → precio (gated) → stock (3 estados) → stepper+Add o
 * Notify según ordenabilidad.
 */
export function ProductBuyBox({
  product,
  shortDescription,
  customerPrice,
  currency,
  locale,
  showPrice,
  canAddToCart,
  disabledReason,
  signInLabel,
}: Props) {
  const stockState = deriveStockState(product.stockQuantity, product.attributes)
  const needsNotify = stockState === 'incoming' || stockState === 'coming_soon'

  // SpecReadout instrumento: health/cycles constantes (spec-aprobados); capacity
  // SOLO si attributes.capacity es string real (FU-010).
  const attrs =
    product.attributes && typeof product.attributes === 'object'
      ? (product.attributes as Record<string, unknown>)
      : {}
  const capacity =
    typeof attrs.capacity === 'string' && attrs.capacity.trim() !== '' ? attrs.capacity : null
  const specRows: SpecRow[] = [
    { value: '100%', labelKey: 'spec.label.health' },
    { value: '0', labelKey: 'spec.label.cycles' },
    ...(capacity ? [{ value: capacity, up: true, labelKey: 'spec.label.capacity' as const }] : []),
  ]

  return (
    <div>
      <Link
        href={`/catalog?category=${product.category.slug}`}
        className="font-mono text-xs uppercase tracking-wide text-gray-500 hover:text-gray-900"
      >
        {product.category.name}
      </Link>
      <p className="mt-1 font-mono text-[11px] text-gray-400">{product.sku}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{product.name}</h1>

      {shortDescription && <p className="mt-3 text-sm text-gray-600">{shortDescription}</p>}

      <SpecReadout rows={specRows} locale={locale} />

      <div className="mt-1">
        {showPrice ? (
          <PriceTag
            basePrice={product.basePrice}
            customerPrice={customerPrice}
            currency={currency}
            size="lg"
          />
        ) : (
          <Link
            href="/sign-in"
            className="inline-flex items-center rounded-lg border border-lime-200 bg-lime-50 px-4 py-2 text-sm font-medium text-lime-700 hover:bg-lime-100"
          >
            {signInLabel}
          </Link>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <span className={`h-2.5 w-2.5 rounded-full ${STOCK_DOT[stockState]}`} aria-hidden="true" />
        {stockLabel(stockState, locale)}
      </div>

      <div className="mt-5">
        {needsNotify ? (
          <NotifyButton productName={product.name} label={t(locale, 'catalog.notify')} />
        ) : showPrice ? (
          <AddToCartButton
            productId={product.id}
            locale={locale}
            returnTo={`/products/${product.slug}`}
            showQuantity
            disabled={!canAddToCart || !isOrderable(stockState)}
            disabledReason={disabledReason}
          />
        ) : null}
      </div>
    </div>
  )
}
