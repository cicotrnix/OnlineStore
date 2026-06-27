import type { MessageKey } from '@/lib/i18n'

export type HeroStat = {
  labelKey: MessageKey
  /** Lectura numérica (number + unit). Mutuamente excluyente con valueKey. */
  number?: string
  unit?: string
  /** Lectura CUALITATIVA: clave i18n del valor (texto, sin número). Se renderiza
   * como badge en el StatStrip — distingue un claim cualitativo de un dato duro. */
  valueKey?: MessageKey
}

/**
 * Stats de la tira "Back to 100%" + chip de capacidad del HeroGauge.
 * Regla del design system: NUNCA inventar datos.
 * - 0 ciclos / 100% salud: definicionales de una batería nueva.
 * - Capacidad: lectura CUALITATIVA ("Capacidad superior", sin %). Un % único era
 *   inexacto (rango +4.7% a +32.7% por modelo); el mAh real por modelo es el dato
 *   duro y vive en el PDP. Ver docs/sources/claims-map.md.
 * - Ventana de envío (24–48h): sigue FUERA hasta tener fuente formal.
 */
export const HERO_STATS: HeroStat[] = [
  { number: '0', unit: '×', labelKey: 'landing.stats.cycles.label' },
  { number: '100', unit: '%', labelKey: 'landing.stats.health.label' },
  { valueKey: 'landing.stats.capacity.value', labelKey: 'landing.stats.capacity.label' },
]

/** Claim NUMÉRICO para el chip del HeroGauge (p.ej. "+10%"). El stat de capacidad
 * cualitativo (valueKey, sin número) NO alimenta el chip → undefined. */
export function heroCapacityClaim(): string | undefined {
  const c = HERO_STATS.find((s) => s.labelKey === 'landing.stats.capacity.label')
  return c?.number ? `${c.number}${c.unit ?? ''}` : undefined
}
