'use server'

import { RESET_TOKEN_TTL_MS, generateResetToken, hashResetToken } from '@/lib/auth/password-reset'
import { prisma } from '@/lib/db/client'
import { sendEmail } from '@/lib/email/resend'
import type { ActionResult } from '@/lib/feedback/action-result'
import { type Locale, t } from '@/lib/i18n/messages'
import { PASSWORD_RESET_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { renderPasswordResetEmail } from '@/modules/notifications'
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

  // Rate-limit por IP **y** por email. El key por-email evita que un atacante
  // rotando IPs inunde el inbox de una víctima conocida (M-2 del security
  // review). Keyea sobre el email enviado (no sobre su existencia) → no filtra
  // enumeración. Si cualquiera excede, respondemos neutro (no filtramos nada).
  // Hardening de launch (NO ahora): el store es in-memory por instancia; en
  // deploy multi-instancia mover a un store compartido (Redis) para que el
  // límite sea global. Ver docs/runbooks/launch-readiness-pipower.md.
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rlIp = checkRateLimit(`pwreset:ip:${ip}`, PASSWORD_RESET_LIMITS)
  const rlEmail = checkRateLimit(`pwreset:email:${email}`, PASSWORD_RESET_LIMITS)
  if (!rlIp.allowed || !rlEmail.allowed) return NEUTRAL

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

  // Envío fire-and-forget (M-1 anti-enumeración por timing): NO esperamos el
  // round-trip a Resend, así la rama existing-user no tarda más que la no-user.
  // .catch traga el error para no dejar una promesa rejected colgada — el
  // usuario ve la misma respuesta neutra pase lo que pase con el email.
  // (Corre en un proceso Node persistente — VPS Hetzner/Coolify, no serverless —
  // así que la promesa completa después de responder.)
  // Link RELATIVO: BaseTemplate le antepone appUrl. El token crudo viaja solo
  // en el email (en DB queda el hash).
  const locale: Locale = user.preferredLocale === 'es-419' ? 'es-419' : 'en-US'
  const recipient = user.email
  const displayName = user.name ?? user.email
  void (async () => {
    const html = await renderPasswordResetEmail(
      {
        title: t(locale, 'email.reset.heading'),
        body: t(locale, 'email.reset.body'),
        userName: displayName,
        link: `/reset-password/${raw}`,
      },
      locale
    )
    await sendEmail({
      to: recipient,
      subject: t(locale, 'email.reset.subject'),
      html,
    })
  })().catch(() => {})

  return NEUTRAL
}
