import Link from 'next/link'
import type { ReactNode } from 'react'

/** Contenedor de filtros (search + selects) sobre una lista. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>
}

/** Tab de filtro tipo link (p.ej. all/pending/verified en customers). */
export function FilterTab({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-button px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-accent/10 font-medium text-ink-950'
          : 'text-ink-500 hover:bg-line/60 hover:text-ink-950'
      }`}
    >
      {children}
    </Link>
  )
}
