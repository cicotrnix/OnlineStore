import { expect, test } from '@playwright/test'

test('storefront homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
})
