import { expect, test } from '@playwright/test'

// Regression for the React 19 `useActionState` bug (PR #22 — 2026-06-09).
// SignInForm fue compilado contra React 18.3 / Next 14, donde `useActionState`
// no existe en runtime y el componente caía al error boundary
// ("Something went wrong"). El fix usa `useFormState` de `react-dom`.
// Este spec falla si alguien revierte a `useActionState`: el form no renderiza,
// el input desaparece, y/o aparece el error boundary.
//
// Post password-login (2026-06-10): el sign-in tiene dos formas, primary
// "Entrar" (password) + alternativa "Enviar link mágico" oculta tras toggle.
// El guard ahora chequea ambas: input email visible + botón password visible
// (el primer botón Entrar) + sin error boundary.
test.describe('/sign-in render (useFormState regression guard)', () => {
  test('renderiza input email + botón submit, sin error boundary', async ({ page }) => {
    await page.goto('/sign-in')

    await expect(page.locator('input[name="email"]').first()).toBeVisible()
    // Primary submit del password form. Si useActionState rompe el render,
    // este botón no aparece porque el form entero cae al error boundary.
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible()
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0)
  })
})
