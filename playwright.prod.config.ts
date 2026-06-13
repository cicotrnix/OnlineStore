import { defineConfig, devices } from '@playwright/test'

/**
 * TST-6 (auditoría 2026-06-12): e2e contra el BUILD DE PRODUCCIÓN (next start),
 * no contra `pnpm dev`. Atrapa bugs que solo aparecen en prod (p.ej. el 500 de
 * gsap en la home, comportamiento de RSC/middleware compilado, CSP estricta).
 *
 * Alcance: smoke de rutas públicas + a11y (axe). NO incluye el flujo de tarjeta
 * (purchase-flow): en producción, Stripe habilitado sin claves dispara el
 * fail-fast (ADR 0038), así que ese spec vive en el e2e de dev (FakeStripe).
 * Aquí Stripe queda deshabilitado (sin STRIPE_ENABLED) → sin fail-fast.
 */
export default defineConfig({
  testDir: './tests/e2e-prod',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build limpio + start de producción. NODE_ENV=production lo setea next.
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
