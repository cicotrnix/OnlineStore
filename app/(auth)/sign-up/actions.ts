'use server'

import { signIn } from '@/lib/auth'
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password'
import { prisma } from '@/lib/db/client'
import type { ActionResult } from '@/lib/feedback/action-result'
import { type RateLimitConfig, SIGNIN_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const SIGNUP_IP_LIMITS: RateLimitConfig = { perMinute: 5, perHour: 20 }

/**
 * Registro nuevo de usuario. Crea User con hashedPassword + emailVerified null
 * y dispara el magic link de verificación. El magic link de Auth.js marca
 * emailVerified al clickear (verificado en Task 0).
 *
 * Anti account-hijack (spec §4.4): si el email YA existe (verificado o no, con
 * o sin password), rebotar. Nunca pisar una row existente.
 *
 * Race guard: en paralelo, dos signups con mismo email pueden pasar el "no
 * existe" check; el segundo cae en P2002 (unique constraint) y rebota igual.
 */
export async function signUpAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!email) return { ok: false, messageKey: 'auth.toast.invalidEmail' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`signup:${ip}:${email}`, SIGNIN_LIMITS).allowed) {
    return { ok: false, messageKey: 'auth.toast.rateLimited' }
  }
  if (!checkRateLimit(`signup-ip:${ip}`, SIGNUP_IP_LIMITS).allowed) {
    return { ok: false, messageKey: 'auth.toast.rateLimited' }
  }

  if (!validatePasswordPolicy(password).ok) {
    return { ok: false, messageKey: 'auth.toast.weakPassword' }
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) return { ok: false, messageKey: 'auth.toast.accountExists' }

  const hashed = await hashPassword(password)
  try {
    await prisma.user.create({ data: { email, hashedPassword: hashed } })
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return { ok: false, messageKey: 'auth.toast.accountExists' }
    }
    throw e
  }

  await signIn('resend', { email, redirect: false })
  return { ok: true, messageKey: 'auth.toast.checkEmailToConfirm' }
}
