// WCAG 2.1 AA (auditoría 2026-06-12): el contador [data-hero-pct] lo muta GSAP
// ~60 veces/seg de 0→100. Con aria-live="polite" un lector de pantalla recibe
// una ráfaga de anuncios. No debe llevar aria-live.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeroGauge } from '../HeroGauge'

describe('HeroGauge a11y', () => {
  it('el contador animado por GSAP no tiene aria-live', () => {
    const { container } = render(<HeroGauge locale="en-US" />)
    const counter = container.querySelector('[data-hero-pct]')
    expect(counter).not.toBeNull()
    expect(counter?.getAttribute('aria-live')).toBeNull()
  })
})
