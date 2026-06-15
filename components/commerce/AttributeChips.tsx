import type { Locale } from '@/lib/i18n'
import { CHIP_TONE, chipLabel, deriveChips } from './product-display'

/**
 * Fila de chips por atributo (sello `0-cycle · 100%` + spot-weld / plug&play /
 * flex / tag-on / capacity). Dirigida por DATOS (`attributes` + categoría), nunca
 * por el nombre. La comparten el `ProductCard` (catálogo/search/related) y el
 * hero de la PDP — mismo sistema visual, una sola fuente.
 */
export function AttributeChips({
  attributes,
  categorySlug,
  locale,
  className = '',
}: {
  attributes?: unknown
  categorySlug?: string | null
  locale: Locale
  className?: string
}) {
  const chips = deriveChips({ attributes, categorySlug: categorySlug ?? null })
  if (chips.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((c) => (
        <span
          key={c.key + (c.value ?? '')}
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium ${CHIP_TONE[c.key]}`}
        >
          {chipLabel(c, locale)}
        </span>
      ))}
    </div>
  )
}
