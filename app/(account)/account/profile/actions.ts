'use server'

import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import type { ActionResult } from '@/lib/feedback/action-result'

/** Locales soportados (mismos que el resolver de i18n). */
const ALLOWED_LOCALES = new Set(['en-US', 'es-419'])

/**
 * Edita el perfil del usuario: name + preferredLocale (persistido). El email es
 * identidad de auth → no se cambia acá. Valida el nombre y que el locale esté en
 * el set permitido antes de escribir.
 */
export async function updateProfileAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, messageKey: 'auth.toast.unauthenticated' }

  const name = String(fd.get('name') ?? '').trim()
  const locale = String(fd.get('locale') ?? '')
  if (name.length < 1 || name.length > 100) {
    return { ok: false, messageKey: 'account.toast.profileInvalid' }
  }
  if (!ALLOWED_LOCALES.has(locale)) {
    return { ok: false, messageKey: 'account.toast.profileInvalid' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, preferredLocale: locale },
  })
  return { ok: true, messageKey: 'account.toast.profileSaved' }
}
