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
    await expect(page.getByText(/Crema facial/i).first()).toBeVisible()
  })

  test('category filter via pill', async ({ page }) => {
    await page.goto('/catalog')
    await page
      .getByRole('link', { name: /Limpieza/i })
      .first()
      .click()
    await expect(page).toHaveURL(/category=limpieza/)
    await expect(page.getByText(/Jabón líquido/i).first()).toBeVisible()
  })

  test('product detail page renders with price', async ({ page }) => {
    await page.goto('/products/crema-facial-hidratante')
    await expect(page.getByRole('heading', { name: /Crema facial hidratante/i })).toBeVisible()
    await expect(page.getByText(/\$\d+\.\d{2}/)).toBeVisible()
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
