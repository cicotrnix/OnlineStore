/**
 * SEC-1 / WCAG (auditoría 2026-06-12): gate de accesibilidad con axe contra el
 * build de producción. Detecta regresiones de a11y (contraste, aria, roles)
 * ANTES de propagar el patrón "Back to 100%" a más superficies.
 *
 * Gate: cero violaciones de impacto 'serious' o 'critical' en las rutas clave.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/catalog', '/sign-in', '/products/iphone-13']

for (const path of ROUTES) {
  test(`a11y axe: ${path} sin violaciones serious/critical`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    )
    if (blocking.length > 0) {
      console.log(
        `axe ${path}:`,
        JSON.stringify(
          blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
          null,
          2
        )
      )
    }
    expect(blocking, `violaciones a11y serious/critical en ${path}`).toEqual([])
  })
}
