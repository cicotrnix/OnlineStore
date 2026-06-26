import type { MessageKey } from '@/lib/i18n'

export type HeroStat = { number: string; unit: string; labelKey: MessageKey }

/**
 * Stats de la tira "Back to 100%" + chip de capacidad del HeroGauge (única
 * fuente). Regla del design system: NUNCA inventar datos.
 * - 0 ciclos / 100% salud: definicionales de una batería nueva.
 * - +10% retirado — se usa "Extended Capacity" sin %, ver docs/sources/claims-map.md.
 * - Ventana de envío (24–48h): sigue FUERA hasta tener fuente formal.
 */
export const HERO_STATS: HeroStat[] = [
  { number: '0', unit: '×', labelKey: 'landing.stats.cycles.label' },
  { number: '100', unit: '%', labelKey: 'landing.stats.health.label' },
]

/** Claim de capacidad para el chip del HeroGauge (p.ej. "+10%"), derivado de la
 * misma fuente que el StatStrip. undefined si no hay stat de capacidad. */
export function heroCapacityClaim(): string | undefined {
  const c = HERO_STATS.find((s) => s.labelKey === 'landing.stats.capacity.label')
  return c ? `${c.number}${c.unit}` : undefined
}
