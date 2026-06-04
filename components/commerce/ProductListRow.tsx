import type { Locale } from '@/lib/i18n'
import type { Decimal } from '@prisma/client/runtime/library'
import Link from 'next/link'
import { AddToCartButton } from './AddToCartButton'
import { PriceTag } from './PriceTag'
import { StockBadge } from './StockBadge'

type Product = {
  id: string
  slug: string
  sku: string
  name: string
  basePrice: Decimal
  stockQuantity: number
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
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3 text-xs text-gray-500 font-mono">{product.sku}</td>
      <td className="px-3 py-3">
        <Link href={`/products/${product.slug}`} className="font-medium hover:underline">
          {product.name}
        </Link>
      </td>
      <td className="px-3 py-3 text-xs text-gray-500">{product.category.name}</td>
      <td className="px-3 py-3">
        <StockBadge stockQuantity={product.stockQuantity} />
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
          <Link href="/sign-in" className="text-xs text-blue-700 hover:underline">
            {signInLabel}
          </Link>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {showPrice && (
          <AddToCartButton
            productId={product.id}
            locale={locale}
            returnTo={returnTo}
            showQuantity
            disabled={!canAddToCart || product.stockQuantity === 0}
            disabledReason={disabledReason}
          />
        )}
      </td>
    </tr>
  )
}
