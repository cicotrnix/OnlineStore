'use server'

import { RESET_TOKEN_TTL_MS, generateResetToken, hashResetToken } from '@/lib/auth/password-reset'
import { prisma } from '@/lib/db/client'
import { sendEmail } from '@/lib/email/resend'
import type { ActionResult } from '@/lib/feedback/action-result'
import { PASSWORD_RESET_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

/**
 * Solicita un link de reset de contraseña.
 *
 * Anti-enumeración: la respuesta es SIEMPRE neutra (mismo ActionResult exista
 * o no el usuario, esté o no rate-limited). Nunca revela si el email existe.
 *
 * Solo cuando el usuario existe: invalida tokens previos sin usar y emite uno
 * nuevo (crudo solo en el email, hash SHA-256 en DB, TTL 1h).
 */
const NEUTRAL: ActionResult = { ok: true, messageKey: 'auth.toast.resetLinkSent' }

export async function requestPasswordResetAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!email) return NEUTRAL

  // Rate-limit por IP. Si excede, igual respondemos neutro (no filtramos nada).
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`pwreset:${ip}`, PASSWORD_RESET_LIMITS)
  if (!rl.allowed) return NEUTRAL

  // Lookup case-insensitive: el email puede haberse guardado con otra caja.
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
  if (!user) return NEUTRAL

  // Un solo token vivo por usuario: descartá los anteriores sin usar.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

  const raw = generateResetToken()
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(raw),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${baseUrl}/reset-password/${raw}`
  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    html: `<p>We received a request to reset your password.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  })

  return NEUTRAL
}
