import type { MessageKey } from '@/lib/i18n'

export type HeroStat = { number: string; unit: string; labelKey: MessageKey }

/**
 * Stats de la tira "Back to 100%". Regla del design system: NUNCA inventar
 * datos. Solo afirmaciones verificables/definicionales de una batería nueva
 * ("0 ciclos", "100% salud"). Claims sin fuente (capacidad vs OEM, ventana de
 * envío) NO van aquí: o se mueven a store.config con valores reales por tienda,
 * o se omiten. Hoy se omiten.
 */
export const HERO_STATS: HeroStat[] = [
  { number: '0', unit: '×', labelKey: 'landing.stats.cycles.label' },
  { number: '100', unit: '%', labelKey: 'landing.stats.health.label' },
]
