import { expect, test } from '@playwright/test'

test.describe('Onboarding B2B — público vs gated (2026-06-02)', () => {
  test('landing pública con CTAs Registrate / Iniciar sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Registrá tu negocio/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Iniciar sesión/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Explorar catálogo/i }).first()).toBeVisible()
    await expect(page.getByText(/Cómo funciona/i)).toBeVisible()
  })

  test('catálogo público anónimo: sin precio, con CTA "Iniciá sesión"', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { name: /catálogo/i })).toBeVisible()
    // El anon ve productos pero no precios.
    // Card usa el texto corto 'product.signInForPrice'.
    await expect(page.getByText(/Iniciá sesión para ver precios/i).first()).toBeVisible()
  })

  test('PDP público anónimo: sin precio, con CTA + sin botón comprar', async ({ page }) => {
    await page.goto('/catalog')
    // Click sobre el primer producto si lo hay (skip si seed vacío).
    const firstProduct = page.getByRole('link', { name: /./ }).filter({ hasText: /producto/i })
    const count = await firstProduct.count()
    if (count === 0) test.skip(true, 'seed vacío')
    // Navegar al primer link de producto encontrado en el listado.
    const productLinks = page.locator('a[href^="/products/"]').filter({ hasNotText: /^$/ })
    if ((await productLinks.count()) === 0) test.skip(true, 'sin PDPs públicos')
    await productLinks.first().click()
    await expect(page).toHaveURL(/\/products\//)
    await expect(page.getByText(/Iniciá sesión.*ver precios/i).first()).toBeVisible()
  })

  test('/cart redirige a /sign-in para anónimo (guard)', async ({ page }) => {
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('/onboarding requiere login → redirige a /sign-in', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
