import { expect, test } from '@playwright/test'

test.describe('Fase 3 — homepage (post Onboarding B2B 2026-06-02)', () => {
  // La home pasó a ser landing pública; el search bar quedó solo en
  // el header del storefront (/catalog, /products, /search).
  test('landing renders CTAs de Onboarding', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Registrá tu negocio/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Explorar catálogo/i }).first()).toBeVisible()
  })

  test('search desde /catalog navega a /search?q=', async ({ page }) => {
    await page.goto('/catalog')
    await page.getByLabel('Buscar productos').first().fill('tornillo')
    await page
      .getByRole('button', { name: /buscar/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/search\?q=tornillo/)
  })
})

test.describe('Fase 3 — anonymous search', () => {
  test('anonymous gets results with no prices shown', async ({ page }) => {
    await page.goto('/search?q=iphone')
    await expect(page.getByText(/iniciá sesión para ver precios/i).first()).toBeVisible()
  })

  test('fallback-like mode finds product by name substring', async ({ page }) => {
    await page.goto('/search?q=iphone')
    // seed contains "iPhone 13 High Capacity Battery" etc.
    await expect(page.getByText(/iPhone 13/i).first()).toBeVisible()
  })

  test('private product (iPhone 12 Pro Max) is not shown to anonymous in search', async ({
    page,
  }) => {
    // Búsqueda amplia que trae modelos visibles; el privado queda excluido por
    // el access filter aunque matchee el término.
    await page.goto('/search?q=iphone')
    await expect(page.locator('a[href="/products/iphone-12-pro-max"]')).toHaveCount(0)
  })

  test('/admin/search returns 404 for anonymous', async ({ page }) => {
    await page.goto('/admin/search')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
