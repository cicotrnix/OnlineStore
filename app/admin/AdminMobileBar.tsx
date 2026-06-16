'use client'

import { type Locale, t } from '@/lib/i18n/messages'
import { type ReactNode, useState } from 'react'
import { Drawer } from 'vaul'
import { AdminNav, type AdminNavItem } from './AdminNav'

/**
 * Barra superior compacta (slate) en mobile (< lg): hamburguesa que abre un
 * drawer Vaul (direction="left") con el sidebar admin. Vaul aporta focus-trap,
 * scroll-lock y cierre por overlay/Esc + retorno de foco al trigger.
 */
export function AdminMobileBar({
  items,
  locale,
  brand,
  foot,
}: {
  items: AdminNavItem[]
  locale: Locale
  brand: string
  foot: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-3 border-b border-white/10 bg-neutral-900 px-4 py-3 lg:hidden">
      <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
        <Drawer.Trigger asChild>
          <button
            type="button"
            aria-label={t(locale, 'header.menu')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
          <Drawer.Overlay className="fixed inset-0 z-modal-backdrop bg-black/50" />
          <Drawer.Content className="fixed bottom-0 left-0 top-0 z-modal flex w-[78%] max-w-xs flex-col bg-neutral-900 p-5 text-white shadow-xl">
            <Drawer.Title className="text-sm font-semibold text-white">
              {brand}{' '}
              <span className="font-mono text-xs text-white/40">{t(locale, 'admin.label')}</span>
            </Drawer.Title>
            <Drawer.Close asChild>
              <button
                type="button"
                aria-label={t(locale, 'header.close')}
                className="absolute right-4 top-4 rounded-lg p-2 text-white/60 hover:bg-white/10"
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
            <div className="mt-4 flex-1 overflow-y-auto">
              <AdminNav items={items} onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">{foot}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      <span className="text-sm font-semibold text-white">
        {brand}{' '}
        <span className="font-mono text-[11px] uppercase tracking-wide text-white/40">
          {t(locale, 'admin.label')}
        </span>
      </span>
    </div>
  )
}
