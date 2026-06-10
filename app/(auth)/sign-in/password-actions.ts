'use server'

import { prisma } from '@/lib/db/client'
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password'
import { createDbSession } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/feedback/action-result'
import { SIGNIN_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

/**
 * Sign-in con email + contraseña. NO usa el Credentials provider de Auth.js
 * (incompatible con DB sessions). Verifica hash y mintea la misma fila Session
 * que el magic link vía createDbSession.
 *
 * Devuelve ActionResult (NO hace redirect): el form en el cliente decide a
 * dónde navegar cuando state.ok. Facilita el testing.
 */
export async function passwordSignInAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!email || !password) return { ok: false, messageKey: 'auth.toast.invalidCredentials' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`pwlogin:${ip}:${email}`, SIGNIN_LIMITS).allowed) {
    return { ok: false, messageKey: 'auth.toast.rateLimited' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  // Anti-timing: comparar siempre, aun si no hay user/hash.
  const hash = user?.hashedPassword ?? DUMMY_HASH
  const valid = await verifyPassword(password, hash)
  if (!user || !user.hashedPassword || !valid) {
    return { ok: false, messageKey: 'auth.toast.invalidCredentials' }
  }
  if (!user.emailVerified) {
    return { ok: false, messageKey: 'auth.toast.emailNotVerified' }
  }
  await createDbSession(user.id)
  return { ok: true, messageKey: 'auth.toast.signedIn' }
}
