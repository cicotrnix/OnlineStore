'use client'

import {
  type MiniCartData,
  getMiniCart,
  miniCartRemove,
  miniCartSetQuantity,
} from '@/app/(storefront)/_mini-cart-actions'
import { type Locale, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { type ReactNode, useState, useTransition } from 'react'
import { Drawer } from 'vaul'
import { CartLine } from './CartLine'

/**
 * Mini-cart drawer (Vaul). El trigger es el `children` (el `<a href="/cart">` del
 * header, vía `Drawer.Trigger asChild` → queda role=link, fallback no-JS a /cart).
 * Lazy: trae los ítems al abrir. Edición inline (quantity/remove) vía server
 * actions que devuelven el carrito actualizado (sin navegar). Solo para
 * verificados — el header degrada a link plano para el resto (#5).
 */
export function MiniCart({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<MiniCartData | null>(null)
  const [pending, startTransition] = useTransition()

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) startTransition(async () => setData(await getMiniCart()))
  }
  const setQty = (productId: string, quantity: number) =>
    startTransition(async () => setData(await miniCartSetQuantity(productId, quantity)))
  const remove = (productId: string) =>
    startTransition(async () => setData(await miniCartRemove(productId)))

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Trigger asChild>{children}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-modal-backdrop bg-black/40" />
        <Drawer.Content
          aria-busy={pending}
          className="fixed bottom-0 right-0 top-0 z-modal flex w-[88%] max-w-md flex-col bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <Drawer.Title className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              {t(locale, 'minicart.title')}
            </Drawer.Title>
            <Drawer.Close asChild>
              <button
                type="button"
                aria-label={t(locale, 'header.close')}
                className="rounded p-1 text-gray-500 hover:text-gray-900"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </Drawer.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {data === null ? (
              <p className="text-sm text-gray-500">…</p>
            ) : data.items.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-gray-900">{t(locale, 'cart.empty.title')}</p>
                <p className="mt-1 text-sm text-gray-500">{t(locale, 'cart.empty.body')}</p>
              </div>
            ) : (
              <ul className="space-y-5">
                {data.items.map((it) => (
                  <li key={it.productId}>
                    <CartLine
                      item={it}
                      density="compact"
                      locale={locale}
                      onQuantityChange={(q) => setQty(it.productId, q)}
                      onRemove={() => remove(it.productId)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data && data.items.length > 0 && (
            <div className="border-t border-gray-200 px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t(locale, 'cart.subtotal')}</span>
                <span className="font-semibold tabular-nums text-gray-900">
                  {data.subtotalFormatted}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="mt-4 block rounded-lg bg-lime-500 px-4 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-lime-400"
              >
                {t(locale, 'minicart.checkout')}
              </Link>
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="mt-2 block text-center text-xs text-gray-500 hover:underline"
              >
                {t(locale, 'minicart.viewFull')}
              </Link>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
