import { expect, test } from '@playwright/test'

// Regression for the React 19 `useActionState` bug (PR #X — 2026-06-09).
// SignInForm fue compilado contra React 18.3 / Next 14, donde `useActionState`
// no existe en runtime y el componente caía al error boundary
// ("Something went wrong"). El fix usa `useFormState` de `react-dom`.
// Este spec falla si alguien revierte a `useActionState`: el form no renderiza
// y el input desaparece. NO mockea NextAuth — solo verifica que la página
// renderiza el form sin reventar.
test.describe('/sign-in render (useFormState regression guard)', () => {
  test('renderiza input email + botón submit, sin error boundary', async ({ page }) => {
    await page.goto('/sign-in')

    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /enviar link mágico/i })).toBeVisible()
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0)
  })
})
