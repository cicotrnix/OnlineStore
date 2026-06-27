// CAL/UX (auditoría 2026-06-12 · revisado 2026-06-27): la tira de stats de la
// home no inventa claims. El "+10%" de capacidad se retiró (un % único es
// inexacto: el delta real va de +4.7% a +32.7% por modelo) y vuelve como lectura
// CUALITATIVA sin número — "Capacidad superior" / "Higher capacity". El dato duro
// (mAh por modelo) vive en el PDP. El +12% era inventado; la ventana 24–48h sigue
// fuera hasta tener fuente formal del fabricante.
import { describe, expect, it } from 'vitest'
import { HERO_STATS, heroCapacityClaim } from '../_home-stats'

describe('HERO_STATS', () => {
  it('incluye el stat de capacidad CUALITATIVO (texto i18n, sin número como "+10"/"+12")', () => {
    const cap = HERO_STATS.find((s) => s.labelKey === 'landing.stats.capacity.label')
    expect(cap).toBeDefined()
    // Cualitativo: valor por i18n, sin número/unidad numérica.
    expect(cap?.valueKey).toBe('landing.stats.capacity.value')
    expect(cap?.number).toBeUndefined()

    const numbers = HERO_STATS.map((s) => s.number)
    // El "+10%" no vuelve como número; el inventado "+12%" tampoco.
    expect(numbers).not.toContain('+10')
    expect(numbers).not.toContain('+12')
    // 24–48h sin fuente formal → sigue fuera.
    expect(HERO_STATS.map((s) => s.labelKey)).not.toContain('landing.stats.shipping.label')
    expect(numbers).not.toContain('24–48')
  })

  it('conserva los stats definicionales (0 ciclos, 100% salud)', () => {
    const labels = HERO_STATS.map((s) => s.labelKey)
    expect(labels).toContain('landing.stats.cycles.label')
    expect(labels).toContain('landing.stats.health.label')
  })

  it('el chip del HeroGauge queda OFF para el stat cualitativo (no hay % derivado)', () => {
    expect(heroCapacityClaim()).toBeUndefined()
  })
})
