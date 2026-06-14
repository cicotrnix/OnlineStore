'use client'

import { SearchBar } from '@/components/commerce/SearchBar'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { type ReactNode, useState } from 'react'
import { Drawer } from 'vaul'

interface Props {
  locale: Locale
  isSignedIn: boolean
  flags: { rfq: boolean; credit: boolean; approvals: boolean }
  /** Slots server-rendered pasados por el Header. */
  signOut: ReactNode
  notifications: ReactNode
}

/**
 * Nav mobile (< md): hamburguesa en la barra que abre un drawer Vaul con
 * búsqueda, nav, ítems de cuenta (gateados), notificaciones y locale. El carrito
 * queda en la barra (no en el drawer). Vaul aporta focus-trap, scroll-lock y
 * cierre por overlay/Esc.
 */
export function MobileNav({ locale, isSignedIn, flags, signOut, notifications }: Props) {
  const [open, setOpen] = useState(false)
  const link = 'block rounded px-2 py-3 text-base text-ink-700 hover:bg-ink-50'
  const item = (key: MessageKey, href: string) => (
    <Link href={href} className={link} onClick={() => setOpen(false)}>
      {t(locale, key)}
    </Link>
  )

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label={t(locale, 'header.menu')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-modal-backdrop bg-black/40" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 z-modal flex w-[84%] max-w-sm flex-col bg-surface p-5 shadow-xl">
          <Drawer.Title className="sr-only">{t(locale, 'header.menu')}</Drawer.Title>
          <Drawer.Close asChild>
            <button
              type="button"
              aria-label={t(locale, 'header.close')}
              className="self-end rounded-lg p-2 text-ink-500 hover:bg-ink-50"
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

          <div className="mt-2">
            <SearchBar placeholder={t(locale, 'header.searchPlaceholder')} />
          </div>

          <nav className="mt-4 flex flex-1 flex-col">
            {item('header.catalog', '/catalog')}
            {isSignedIn ? (
              <>
                {item('header.orders', '/orders')}
                {item('header.buyAgain', '/orders')}
                {flags.rfq && item('header.quotes', '/quotes')}
                {flags.credit && item('header.invoices', '/invoices')}
                {flags.approvals && item('header.approvals', '/approvals')}
                <div className="px-2 py-3">{notifications}</div>
                <hr className="my-2 border-ink-100" />
                <div className="px-2 py-2">{signOut}</div>
              </>
            ) : (
              <>
                {item('header.signIn', '/sign-in')}
                {item('header.register', '/sign-up')}
              </>
            )}
          </nav>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
