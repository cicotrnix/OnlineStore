// CAL/UX (auditoría 2026-06-12): la tira de stats de la home no debe contener
// claims de marketing inventados (sin fuente). Regla "nunca inventar" del spec.
import { describe, expect, it } from 'vitest'
import { HERO_STATS } from '../_home-stats'

describe('HERO_STATS', () => {
  it('no incluye claims sin fuente (capacidad vs OEM, ventana de envío)', () => {
    const labels = HERO_STATS.map((s) => s.labelKey)
    expect(labels).not.toContain('landing.stats.capacity.label')
    expect(labels).not.toContain('landing.stats.shipping.label')
    // Y ningún número de marketing inventado típico.
    const numbers = HERO_STATS.map((s) => s.number)
    expect(numbers).not.toContain('+12')
    expect(numbers).not.toContain('24–48')
  })

  it('conserva los stats verificables/definicionales (0 ciclos, 100% salud)', () => {
    const labels = HERO_STATS.map((s) => s.labelKey)
    expect(labels).toContain('landing.stats.cycles.label')
    expect(labels).toContain('landing.stats.health.label')
  })
})
