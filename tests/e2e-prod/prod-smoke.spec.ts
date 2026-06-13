/**
 * TST-6: smoke de rutas públicas contra el BUILD DE PRODUCCIÓN (next start).
 * Habría atrapado el 500 de gsap en la home (que `pnpm dev` no exponía).
 * Asserts: 200, sin errores de runtime en consola, y un marcador clave por ruta.
 */
import { expect, test } from '@playwright/test'

const ROUTES: Array<{ path: string; marker: string }> = [
  { path: '/', marker: '[data-hero-pct]' }, // HeroGauge → ejercita gsap en prod
  { path: '/catalog', marker: 'main' },
  { path: '/sign-in', marker: 'input[type="email"], form' },
]

for (const { path, marker } of ROUTES) {
  test(`prod: ${path} responde 200 y renderiza sin errores`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    const resp = await page.goto(path, { waitUntil: 'networkidle' })
    expect(resp?.status(), `status de ${path}`).toBe(200)
    await expect(page.locator(marker).first()).toBeVisible()
    expect(pageErrors, `errores de runtime en ${path}`).toEqual([])
  })
}
