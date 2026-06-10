import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'

const DEFAULT_MAX_AGE_S = 30 * 24 * 60 * 60 // Auth.js default, confirmed via Task 0 audit

export function cookieName(): string {
  const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
  return secure ? '__Secure-authjs.session-token' : 'authjs.session-token'
}

/**
 * Crea una sesión de DB equivalente a la que genera Auth.js (magic link) y
 * setea la cookie de sesión. Reusado por login con contraseña y sign-up.
 *
 * Contrato verificado vs Auth.js v5 core (Task 0):
 * - sessionToken: crypto.randomUUID() (mismo que Auth.js generateSessionToken).
 * - Cookie name: `${prefix}authjs.session-token`, prefix `__Secure-` si NEXTAUTH_URL es https.
 * - Cookie options: httpOnly, sameSite:'lax', path:'/', secure si NEXTAUTH_URL es https.
 * - maxAge: Auth.js default 30 días (no override en lib/auth/config.ts).
 */
export async function createDbSession(userId: string): Promise<void> {
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + DEFAULT_MAX_AGE_S * 1000)
  await prisma.session.create({
    data: { sessionToken: token, userId, expires, lastSeenAt: new Date() },
  })
  const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
  const store = await cookies()
  store.set(cookieName(), token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires,
  })
}
