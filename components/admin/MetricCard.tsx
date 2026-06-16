import Link from 'next/link'
import type { ReactNode } from 'react'

/** Widget numérico del dashboard. Valor en mono tabular. Opcionalmente linkeable. */
export function MetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  href?: string
}) {
  const inner = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ink-950">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </>
  )
  const base = 'block rounded-card border border-line p-5'
  return href ? (
    <Link href={href} className={`${base} transition-colors hover:border-accent`}>
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  )
}
