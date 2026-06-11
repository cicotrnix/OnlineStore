import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/messages'

export interface SpecRow {
  /** Numeric value rendered in mono (e.g. "100%", "0", "+12%"). */
  value: string
  /** True if this row represents a brand "up" reading (capacity over OEM):
   * the value renders in `lime-deep` (AA-safe lime on white). */
  up?: boolean
  /** Translation key for the small uppercase label below the value. */
  labelKey: Parameters<typeof t>[1]
}

/**
 * SpecReadout — instrument-style block of 3 datos (Salud / Ciclos / Cap.) in
 * mono, framed by hairline rules. Sits inside product cards on the Home and
 * Catalog and reappears (enlarged) on the PDP. The "up" flag tints the value
 * in lime-deep (#5fa000) so the lime-as-text passes AA against the white card.
 */
export function SpecReadout({ rows, locale }: { rows: SpecRow[]; locale: Locale }) {
  return (
    <dl className="my-[14px] grid grid-cols-3 gap-[6px] border-y border-line py-[12px]">
      {rows.map((r) => (
        <div key={r.labelKey} className="flex flex-col gap-[1px]">
          <dd
            className={`font-mono text-[15px] font-semibold tracking-[-0.01em] ${
              r.up ? 'text-lime-deep' : 'text-ink-950'
            }`}
          >
            {r.value}
          </dd>
          <dt className="text-[10.5px] uppercase tracking-[0.03em] text-ink-300">
            {t(locale, r.labelKey)}
          </dt>
        </div>
      ))}
    </dl>
  )
}
