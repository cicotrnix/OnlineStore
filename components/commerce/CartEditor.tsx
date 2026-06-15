'use client'

import {
  type MiniCartData,
  miniCartRemove,
  miniCartSetQuantity,
} from '@/app/(storefront)/_mini-cart-actions'
import { type Locale, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { CartLine } from './CartLine'

/**
 * Editor de la página `/cart` (client): líneas full + resumen sticky. Reusa las
 * MISMAS server actions del mini-cart (devuelven el carrito actualizado) y la
 * misma `CartLine` (densidad full). Snapshot pricing y gating se preservan en el
 * servidor; acá solo se edita inline.
 */
export function CartEditor({ initial, locale }: { initial: MiniCartData; locale: Locale }) {
  const [data, setData] = useState(initial)
  const [pending, startTransition] = useTransition()

  const setQty = (productId: string, quantity: number) =>
    startTransition(async () => setData(await miniCartSetQuantity(productId, quantity)))
  const remove = (productId: string) =>
    startTransition(async () => setData(await miniCartRemove(productId)))

  if (data.items.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="text-sm font-medium text-gray-900">{t(locale, 'cart.empty.title')}</p>
        <p className="mt-1 text-sm text-gray-500">{t(locale, 'cart.empty.body')}</p>
        <Link
          href="/catalog"
          className="mt-4 inline-block text-sm font-medium text-lime-700 hover:underline"
        >
          {t(locale, 'cart.empty.goCatalog')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul aria-busy={pending} className="space-y-4">
        {data.items.map((it) => (
          <li key={it.productId} className="rounded-2xl border border-gray-200 bg-white p-4">
            <CartLine
              item={it}
              density="full"
              locale={locale}
              onQuantityChange={(q) => setQty(it.productId, q)}
              onRemove={() => remove(it.productId)}
            />
          </li>
        ))}
      </ul>

      <div className="h-fit rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          {t(locale, 'cart.summary')}
        </h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-gray-500">{t(locale, 'cart.subtotal')}</span>
          <span className="font-semibold tabular-nums text-gray-900">{data.subtotalFormatted}</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">{t(locale, 'cart.taxNote')}</p>
        <Link
          href="/checkout"
          className="mt-5 block rounded-lg bg-lime-500 px-4 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-lime-400"
        >
          {t(locale, 'minicart.checkout')}
        </Link>
        <Link
          href="/catalog"
          className="mt-3 block text-center text-xs text-gray-500 hover:underline"
        >
          {t(locale, 'cart.continueShopping')}
        </Link>
      </div>
    </div>
  )
}
