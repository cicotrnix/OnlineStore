'use server'

import { signIn } from '@/lib/auth'
import type { ActionResult } from '@/lib/feedback/action-result'
import { isRedirectError } from 'next/dist/client/components/redirect'

/**
 * Server action de sign-in. Devuelve ActionResult que el form client consume
 * con `useActionState` y dispara el toast.
 *
 * NextAuth signIn() con `redirect: false` retorna sin throw. Si throws con
 * RedirectError lo dejamos pasar (la redirección es parte normal del flujo).
 */
export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, messageKey: 'auth.toast.linkFailed' }
  try {
    await signIn('resend', { email, redirect: false })
    return { ok: true, messageKey: 'auth.toast.linkSent' }
  } catch (err) {
    if (isRedirectError(err)) throw err
    return { ok: false, messageKey: 'auth.toast.linkFailed' }
  }
}
