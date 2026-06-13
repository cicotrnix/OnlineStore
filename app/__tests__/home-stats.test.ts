// CAL/UX (auditoría 2026-06-12): la tira de stats de la home no debe contener
// claims inventados. El +10% de capacidad es dato REAL de especificaciones de
// batería (restaurado); el +12% era inventado; la ventana 24–48h sigue fuera
// hasta tener fuente formal del fabricante.
import { describe, expect, it } from 'vitest'
import { HERO_STATS } from '../_home-stats'

describe('HERO_STATS', () => {
  it('incluye la capacidad real +10% pero no el inventado +12% ni la ventana de envío sin fuente', () => {
    const labels = HERO_STATS.map((s) => s.labelKey)
    const numbers = HERO_STATS.map((s) => s.number)
    // +10%: dato real de specs (restaurado).
    expect(labels).toContain('landing.stats.capacity.label')
    expect(numbers).toContain('+10')
    // +12% era inventado → no vuelve.
    expect(numbers).not.toContain('+12')
    // 24–48h sin fuente formal → sigue fuera por ahora.
    expect(labels).not.toContain('landing.stats.shipping.label')
    expect(numbers).not.toContain('24–48')
  })

  it('conserva los stats definicionales (0 ciclos, 100% salud)', () => {
    const labels = HERO_STATS.map((s) => s.labelKey)
    expect(labels).toContain('landing.stats.cycles.label')
    expect(labels).toContain('landing.stats.health.label')
  })
})
