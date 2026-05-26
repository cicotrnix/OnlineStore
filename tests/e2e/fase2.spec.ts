import { expect, test } from '@playwright/test'

test.describe('Fase 2 — feature-gated routes (anonymous)', () => {
  test('quotes inbox returns 404 when anonymous', async ({ page }) => {
    const res = await page.goto('/quotes')
    expect(res?.status()).toBe(404)
  })

  test('invoices inbox returns 404 when anonymous', async ({ page }) => {
    const res = await page.goto('/invoices')
    expect(res?.status()).toBe(404)
  })

  test('approvals inbox returns 404 when anonymous', async ({ page }) => {
    const res = await page.goto('/approvals')
    expect(res?.status()).toBe(404)
  })

  test('notifications inbox redirects to sign-in when anonymous', async ({ page }) => {
    await page.goto('/notifications')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

test.describe('Fase 2 — catalog visibility', () => {
  test('anonymous catalog does NOT expose private product (COS-003 serum)', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByText(/Serum vitamina C/i)).toHaveCount(0)
  })

  test('anonymous direct visit to private product returns 404', async ({ page }) => {
    const res = await page.goto('/products/serum-vitamina-c')
    expect(res?.status()).toBe(404)
  })
})

test.describe('Fase 2 — volume discount tiers visible on product page', () => {
  test('product with tiers shows tier table to anonymous', async ({ page }) => {
    await page.goto('/products/protector-solar-spf50')
    await expect(page.getByRole('heading', { name: /Protector solar/i })).toBeVisible()
    await expect(page.getByText(/12\+/i).first()).toBeVisible()
  })
})
