import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { Decimal } from '@prisma/client/runtime/library'
import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { NotifyButton } from './NotifyButton'
import { PriceTag } from './PriceTag'
import {
  CHIP_TONE,
  STOCK_DOT,
  chipLabel,
  deriveChips,
  deriveStockState,
  stockLabel,
} from './product-display'

type Product = {
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
  product: Product
  customerPrice?: Decimal | null
  currency: string
  canAddToCart: boolean
  locale: Locale
  disabledReason?: string
  showPrice?: boolean
  signInLabel?: string
  returnTo?: string
}

/**
 * Vista B (lista densa) — re-orden / compra grande. Mismo sistema visual que el
 * card: chips por atributo (sin el sello, redundante en denso), estado de stock
 * con punto + texto, cantidad por fila. Notify para no-ordenables.
 */
export function ProductListRow({
  product,
  customerPrice,
  currency,
  canAddToCart,
  locale,
  disabledReason,
  showPrice = true,
  signInLabel = 'Sign in',
  returnTo,
}: Props) {
  const stockState = deriveStockState(product.stockQuantity, product.attributes)
  // En denso, el sello 0-cycle·100% (constante) se omite; solo diferenciadores.
  const chips = deriveChips({
    attributes: product.attributes,
    categorySlug: product.category.slug,
  }).filter((c) => c.key !== 'seal')
  const needsNotify = stockState === 'incoming' || stockState === 'coming_soon'

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
      <td className="px-3 py-3">
        <Link
          href={`/products/${product.slug}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {product.name}
        </Link>
        {chips.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span
                key={c.key + (c.value ?? '')}
                className={`inline-flex items-center rounded border px-1 py-0.5 font-mono text-[9px] font-medium ${CHIP_TONE[c.key]}`}
              >
                {chipLabel(c, locale)}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-gray-500">{product.category.name}</td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`h-2 w-2 rounded-full ${STOCK_DOT[stockState]}`} aria-hidden="true" />
          {stockLabel(stockState, locale)}
        </span>
      </td>
      <td className="px-3 py-3">
        {showPrice ? (
          <PriceTag
            basePrice={product.basePrice}
            customerPrice={customerPrice}
            currency={currency}
            size="sm"
          />
        ) : (
          <Link href="/sign-in" className="text-xs font-medium text-lime-700 hover:underline">
            {signInLabel}
          </Link>
        )}
      </td>
      <td className="px-3 py-3 text-right">
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
      </td>
    </tr>
  )
}
