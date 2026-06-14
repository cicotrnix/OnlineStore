import { expect, test } from '@playwright/test'

test.describe('storefront — anonymous browsing', () => {
  test('home loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
  })

  test('catalog lists products from seed', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { name: /catálogo/i })).toBeVisible()
    // At least the demo seed products should render
    await expect(page.getByText(/iPhone 13/i).first()).toBeVisible()
  })

  test('category filter via pill', async ({ page }) => {
    await page.goto('/catalog')
    await page
      .getByRole('link', { name: /Battery Cell/i })
      .first()
      .click()
    await expect(page).toHaveURL(/category=battery-cell/)
    await expect(page.getByText(/iPhone 14/i).first()).toBeVisible()
  })

  test('product detail page renders (anónimo ve CTA en vez de precio — Onboarding B2B)', async ({
    page,
  }) => {
    await page.goto('/products/iphone-13')
    await expect(page.getByRole('heading', { name: /iPhone 13/i })).toBeVisible()
    // Onboarding B2B 2026-06-02: el anónimo ve specs/contenido pero NO precio.
    await expect(page.getByText(/ver precios mayoristas/i).first()).toBeVisible()
  })

  test('anonymous user redirected to sign-in when accessing cart', async ({ page }) => {
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('admin redirects anonymous to sign-in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('ok')
  })
})
