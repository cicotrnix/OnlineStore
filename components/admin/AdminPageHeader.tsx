import type { ReactNode } from 'react'

/** Header de página admin: título + subtítulo/conteo + slot de acción primaria. */
export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
