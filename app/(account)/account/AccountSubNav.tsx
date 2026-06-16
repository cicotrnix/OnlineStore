'use client'

import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS: ReadonlyArray<{ href: string; key: MessageKey }> = [
  { href: '/account', key: 'account.nav.overview' },
  { href: '/account/profile', key: 'account.nav.profile' },
  { href: '/account/addresses', key: 'account.nav.addresses' },
  { href: '/account/security', key: 'account.nav.security' },
]

/**
 * Sub-navegación intra-cuenta. Vertical en desktop, tabs horizontales
 * scrollables en mobile. Activo con aria-current="page" + acento lima.
 * (No duplica el menú "My account" del header: eso es entrada/salida; esto es
 * navegación dentro del hub.)
 */
export function AccountSubNav({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  return (
    <nav aria-label={t(locale, 'account.title')}>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
        {ITEMS.map((it) => {
          const active = pathname === it.href
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-button px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-accent/10 font-medium text-ink-950'
                    : 'text-ink-500 hover:bg-line/60 hover:text-ink-950'
                }`}
              >
                {t(locale, it.key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
