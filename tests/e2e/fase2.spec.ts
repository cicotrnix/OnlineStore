import { expect, test } from '@playwright/test'

test.describe('Fase 2 — feature-gated routes (anonymous, post Onboarding B2B)', () => {
  // Onboarding B2B 2026-06-02: rutas gated ahora redirigen a /sign-in
  // (vía requireVerifiedCustomer) en lugar de devolver 404.
  test('quotes redirects to sign-in when anonymous', async ({ page }) => {
    await page.goto('/quotes')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('invoices redirects to sign-in when anonymous', async ({ page }) => {
    await page.goto('/invoices')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('approvals redirects to sign-in when anonymous', async ({ page }) => {
    await page.goto('/approvals')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('notifications redirects to sign-in when anonymous', async ({ page }) => {
    await page.goto('/notifications')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

test.describe('Fase 2 — catalog visibility', () => {
  test('anonymous catalog does NOT expose private product (iPhone 12 Pro Max)', async ({
    page,
  }) => {
    await page.goto('/catalog')
    // href exacto: robusto a substrings de otros modelos "Pro Max" visibles.
    await expect(page.locator('a[href="/products/iphone-12-pro-max"]')).toHaveCount(0)
  })

  test('anonymous direct visit to private product returns 404', async ({ page }) => {
    const res = await page.goto('/products/iphone-12-pro-max')
    expect(res?.status()).toBe(404)
  })
})

test.describe('Fase 2 — volume discount tiers visible on product page', () => {
  test('product with tiers shows tier table to anonymous', async ({ page }) => {
    await page.goto('/products/iphone-13')
    await expect(page.getByRole('heading', { name: /iPhone 13/i })).toBeVisible()
    await expect(page.getByText(/12\+/i).first()).toBeVisible()
  })
})
