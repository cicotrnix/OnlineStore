import { expect, test } from '@playwright/test'

test.describe('Fase 3 — homepage', () => {
  test('renders hero, search input, featured grid', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByLabel('Buscar productos').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /productos destacados/i })).toBeVisible()
  })

  test('search submit navigates to /search?q=', async ({ page }) => {
    await page.goto('/')
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
    await page.goto('/search?q=Crema')
    await expect(page.getByText(/iniciá sesión para ver precios/i).first()).toBeVisible()
  })

  test('fallback-like mode finds product by name substring', async ({ page }) => {
    await page.goto('/search?q=Crema')
    // seed contains "Crema facial hidratante 50ml"
    await expect(page.getByText(/Crema facial hidratante/i).first()).toBeVisible()
  })

  test('private product (COS-003 serum) is not shown to anonymous in search', async ({ page }) => {
    await page.goto('/search?q=Serum')
    await expect(page.getByText(/Serum vitamina C/i)).toHaveCount(0)
  })

  test('/admin/search returns 404 for anonymous', async ({ page }) => {
    await page.goto('/admin/search')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
