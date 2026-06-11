import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/messages'

export interface Stat {
  /** Numeric part of the readout — kept as a string so callers can format
   * (e.g. "100", "24–48", "+12%"). The unit suffix is rendered separately so
   * it can pick up the lime accent. */
  number: string
  /** Unit suffix (e.g. "×", "%", "h"). Rendered lime as a brand mark. */
  unit?: string
  /** Translation key for the descriptive caption under the number. */
  labelKey: Parameters<typeof t>[1]
}

/**
 * StatStrip — instrument-grade tira de métricas sobre slate-deep.
 * Signature element of the "Back to 100%" design system: each cell is a
 * mono number + lime unit + descriptive caption. Designed to be reusable
 * on any surface (Home, PDP, landing variants) — caller passes the data.
 */
export function StatStrip({ stats, locale }: { stats: Stat[]; locale: Locale }) {
  return (
    <section
      className="border-t border-white/[0.06] bg-neutral-900 text-surface"
      data-header-theme="dark"
    >
      <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-[30px] md:px-8 md:grid-cols-4 md:gap-6">
        {stats.map((s) => (
          <div key={s.labelKey} data-reveal>
            <div className="font-mono text-[26px] md:text-[30px] font-semibold tracking-[-0.02em] text-surface">
              {s.number}
              {s.unit ? <span className="text-accent">{s.unit}</span> : null}
            </div>
            <div className="mt-[3px] text-[13.5px] text-on-dark-2">{t(locale, s.labelKey)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
