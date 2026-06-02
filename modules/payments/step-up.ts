/**
 * Step-up authentication para acciones sensibles (refunds, etc).
 * Flow:
 *   1) issueSensitiveActionToken(userId, action, subjectId) → genera OTP por email
 *      y devuelve un opaque token. Guarda hashes (token + OTP) + contador de
 *      intentos OTP.
 *   2) Usuario recibe email con OTP. Confirma con consumeSensitiveActionToken
 *      pasando token + OTP. Se marca USED y devuelve true.
 *
 * Hardening Fase 5 review:
 * - OTP usa crypto.randomInt (no Math.random).
 * - Contador otpAttempts: tras MAX_OTP_ATTEMPTS=5 OTP fallidos → status=BLOCKED.
 *
 * El consumer (refundPayment) verifica el token antes de ejecutar la acción.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { prisma } from '@/lib/db/client'

const TTL_MS = 10 * 60 * 1000 // 10 min
export const MAX_OTP_ATTEMPTS = 5

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export interface IssuedToken {
  token: string
  otp: string // mostrar al caller — el caller envía por email (no por test)
  expiresAt: Date
}

export async function issueSensitiveActionToken(input: {
  userId: string
  action: string
  subjectId: string
}): Promise<IssuedToken> {
  const token = randomBytes(24).toString('hex')
  // crypto.randomInt(min, max) → [min, max). 100000..999999 → 6 dígitos.
  const otp = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + TTL_MS)
  await prisma.sensitiveActionToken.create({
    data: {
      userId: input.userId,
      action: input.action,
      subjectId: input.subjectId,
      tokenHash: sha256(token),
      otpHash: sha256(otp),
      expiresAt,
    },
  })
  return { token, otp, expiresAt }
}

export async function consumeSensitiveActionToken(input: {
  token: string
  otp: string
  userId: string
  action: string
  subjectId: string
}): Promise<boolean> {
  const row = await prisma.sensitiveActionToken.findUnique({
    where: { tokenHash: sha256(input.token) },
  })
  if (!row) return false
  if (row.status !== 'ISSUED') return false
  if (row.expiresAt < new Date()) {
    await prisma.sensitiveActionToken.update({
      where: { id: row.id },
      data: { status: 'EXPIRED' },
    })
    return false
  }
  if (
    row.userId !== input.userId ||
    row.action !== input.action ||
    row.subjectId !== input.subjectId
  ) {
    return false
  }
  if (row.otpHash !== sha256(input.otp)) {
    const nextAttempts = row.otpAttempts + 1
    const block = nextAttempts >= MAX_OTP_ATTEMPTS
    await prisma.sensitiveActionToken.update({
      where: { id: row.id },
      data: {
        otpAttempts: nextAttempts,
        ...(block ? { status: 'BLOCKED' as const } : {}),
      },
    })
    return false
  }

  await prisma.sensitiveActionToken.update({
    where: { id: row.id },
    data: { status: 'USED', usedAt: new Date() },
  })
  return true
}
