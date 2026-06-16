'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type AdminNavItem = { href: string; label: string }

/**
 * Nav del sidebar admin (slate). Item activo en lima con aria-current="page".
 * Reusado por el sidebar desktop y el drawer mobile (onNavigate cierra el drawer).
 */
export function AdminNav({
  items,
  onNavigate,
}: {
  items: AdminNavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Admin" className="space-y-0.5">
      {items.map((n) => {
        const active =
          n.href === '/admin'
            ? pathname === '/admin'
            : pathname === n.href || pathname.startsWith(`${n.href}/`)
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={`block rounded-button px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-white/10 font-medium text-accent'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
