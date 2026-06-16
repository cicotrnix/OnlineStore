'use server'

import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password'
import { hashResetToken } from '@/lib/auth/password-reset'
import { createDbSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import type { ActionResult } from '@/lib/feedback/action-result'

/**
 * Consume un token de reset y fija la nueva contraseña.
 *
 * Seguridad:
 * - Valida la política ANTES de consumir el token: una contraseña débil no
 *   quema el token de un solo uso.
 * - Consumo atómico vía updateMany con el predicado completo (usedAt null +
 *   no vencido) dentro de una transacción → evita doble uso / carreras.
 * - Revoca TODAS las sesiones del usuario (session.deleteMany por userId).
 * - Backfill de emailVerified: probar control del inbox verifica el email.
 * - Auto sign-in: emite una sesión fresca; el form navega a /select-org.
 */
const INVALID: ActionResult = { ok: false, messageKey: 'auth.toast.resetTokenInvalid' }

export async function resetPasswordAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const token = String(fd.get('token') ?? '')
  const newPassword = String(fd.get('newPassword') ?? '')

  const policy = validatePasswordPolicy(newPassword)
  if (!policy.ok) return { ok: false, messageKey: 'auth.toast.weakPassword' }
  if (!token) return INVALID

  const tokenHash = hashResetToken(token)
  const hashed = await hashPassword(newPassword)

  let userId: string | null = null
  try {
    userId = await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (consumed.count === 0) return null

      const record = await tx.passwordResetToken.findFirst({ where: { tokenHash } })
      if (!record) return null

      const user = await tx.user.findUnique({ where: { id: record.userId } })
      await tx.user.update({
        where: { id: record.userId },
        data: {
          hashedPassword: hashed,
          passwordUpdatedAt: new Date(),
          emailVerified: user?.emailVerified ?? new Date(),
        },
      })
      // Revoca TODAS las sesiones existentes (no solo las otras).
      await tx.session.deleteMany({ where: { userId: record.userId } })
      return record.userId
    })
  } catch {
    return INVALID
  }

  if (!userId) return INVALID

  await createDbSession(userId)
  return { ok: true, messageKey: 'auth.toast.passwordReset' }
}
