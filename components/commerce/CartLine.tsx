'use client'

import { type Locale, t } from '@/lib/i18n/messages'
import Image from 'next/image'
import Link from 'next/link'
import { QuantityStepper } from './QuantityStepper'

export type CartLineItem = {
  productId: string
  slug: string
  sku: string
  name: string
  imageUrl: string | null
  isActive: boolean
  quantity: number
  /** Precios ya formateados (snapshot del carrito). */
  unitPrice: string
  lineTotal: string
}

type Props = {
  item: CartLineItem
  density: 'compact' | 'full'
  locale: Locale
  onQuantityChange: (qty: number) => void
  onRemove: () => void
}

/**
 * Línea de carrito compartida en dos densidades: `compact` (mini-cart drawer) y
 * `full` (`/cart`). Misma data y mismas callbacks de quantity/remove (el caller
 * las cablea a las server actions). Reusa `QuantityStepper` (con onChange).
 */
export function CartLine({ item, density, locale, onQuantityChange, onRemove }: Props) {
  const compact = density === 'compact'
  const thumb = compact ? 'h-14 w-14' : 'h-20 w-20'

  return (
    <div className={`flex gap-3 ${item.isActive ? '' : 'opacity-60'} ${compact ? '' : 'gap-4'}`}>
      <div
        className={`relative ${thumb} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50`}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes={compact ? '56px' : '80px'}
            className="object-contain p-1"
          />
        ) : (
          <span className="text-[9px] text-gray-500">{t(locale, 'cart.noImage')}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${item.slug}`}
              className="block truncate text-sm font-medium text-gray-900 hover:underline"
            >
              {item.name}
            </Link>
            {!compact && (
              <div className="mt-0.5 font-mono text-xs text-gray-500">
                {t(locale, 'cart.skuLabel')} {item.sku}
              </div>
            )}
            {!item.isActive && (
              <span className="mt-1 inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                {t(locale, 'cart.noLongerAvailable')}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={t(locale, 'cart.remove')}
            onClick={onRemove}
            className="rounded p-1 text-gray-400 hover:text-gray-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper
            name="quantity"
            defaultValue={item.quantity}
            decrementLabel={t(locale, 'catalog.qtyDecrease')}
            incrementLabel={t(locale, 'catalog.qtyIncrease')}
            onChange={onQuantityChange}
          />
          <div className="text-right text-sm tabular-nums text-gray-700">
            <span className="text-xs text-gray-500">{item.unitPrice}</span>{' '}
            <span className="font-medium text-gray-900">{item.lineTotal}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
