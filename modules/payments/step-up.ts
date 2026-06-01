/**
 * Step-up authentication para acciones sensibles (refunds, etc).
 * Flow:
 *   1) issueSensitiveActionToken(userId, action, subjectId) → genera OTP por email
 *      y devuelve un opaque token. Guarda hashes (token + OTP).
 *   2) Usuario recibe email con OTP. Confirma con consumeSensitiveActionToken
 *      pasando token + OTP. Se marca USED y devuelve true.
 *
 * El consumer (refundPayment) verifica el token antes de ejecutar la acción.
 */
import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db/client'

const TTL_MS = 10 * 60 * 1000 // 10 min

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
  const otp = String(Math.floor(100000 + Math.random() * 900000))
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
  if (row.otpHash !== sha256(input.otp)) return false

  await prisma.sensitiveActionToken.update({
    where: { id: row.id },
    data: { status: 'USED', usedAt: new Date() },
  })
  return true
}
