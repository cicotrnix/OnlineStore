'use client'

import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

interface Props {
  locale: Locale
  flags: { rfq: boolean; credit: boolean; approvals: boolean }
  /** Slot del sign out (server-action form), renderizado por el padre server. */
  signOut: ReactNode
  triggerClassName?: string
}

/**
 * Menú de cuenta del header (desktop). Colapsa Orders · Buy again · Quotes ·
 * Invoices · Approvals · Sign out en un dropdown. A11y: abre/cierra por click y
 * teclado, foco al primer ítem al abrir, Esc cierra y devuelve el foco al
 * trigger, click-fuera cierra, aria-expanded/haspopup/controls en el trigger.
 */
export function AccountMenu({ locale, flags, signOut, triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLAnchorElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Foco al primer ítem al abrir.
  useEffect(() => {
    if (open) firstItemRef.current?.focus()
  }, [open])

  // Click fuera (mousedown) cierra.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const itemCls =
    'block px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 focus:bg-ink-50 focus:outline-none'

  const item = (key: MessageKey, href: string, ref?: typeof firstItemRef) => (
    <Link ref={ref} href={href} role="menuitem" className={itemCls}>
      {t(locale, key)}
    </Link>
  )

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {t(locale, 'header.account')} ▾
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t(locale, 'header.account')}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
          }}
          className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-ink-100 bg-surface py-1 shadow-lg"
        >
          {item('header.orders', '/orders', firstItemRef)}
          {item('header.buyAgain', '/orders')}
          {flags.rfq && item('header.quotes', '/quotes')}
          {flags.credit && item('header.invoices', '/invoices')}
          {flags.approvals && item('header.approvals', '/approvals')}
          <hr className="my-1 border-ink-100" />
          <div className="px-2 py-1">{signOut}</div>
        </div>
      )}
    </div>
  )
}
