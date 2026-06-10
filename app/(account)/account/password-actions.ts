'use server'

import { auth } from '@/lib/auth/config'
import { hashPassword, validatePasswordPolicy, verifyPassword } from '@/lib/auth/password'
import { cookieName } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { sendEmail } from '@/lib/email/resend'
import type { ActionResult } from '@/lib/feedback/action-result'
import { consumeSensitiveActionToken, issueSensitiveActionToken } from '@/modules/payments/step-up'
import { cookies } from 'next/headers'

/**
 * Password management actions for the account area.
 *
 * - changePasswordAction: user already has a password; re-auth with current.
 * - setPasswordAction: user is magic-link-only; requires step-up (token+OTP)
 *   so a stolen session cannot silently set a password and lock out the owner.
 * - requestSetPasswordStepUpAction: issues the step-up token + emails the OTP.
 *
 * On successful change/set: invalidate ALL OTHER sessions of the user. The
 * current session (the one matching the auth cookie) stays.
 *
 * All return values are ActionResult; the UI handles navigation.
 */

const ACTION = 'set_password'

async function getCurrentSessionToken(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(cookieName())?.value
}

async function invalidateOtherSessions(userId: string, currentToken: string | undefined) {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(currentToken ? { sessionToken: { not: currentToken } } : {}),
    },
  })
}

export async function changePasswordAction(
  _prev: ActionResult,
  fd: FormData
): Promise<ActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, messageKey: 'auth.toast.unauthenticated' }

  const currentPassword = String(fd.get('currentPassword') ?? '')
  const newPassword = String(fd.get('newPassword') ?? '')
  if (!currentPassword || !newPassword) {
    return { ok: false, messageKey: 'auth.toast.invalidCurrentPassword' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.hashedPassword) {
    return { ok: false, messageKey: 'auth.toast.invalidCurrentPassword' }
  }

  const valid = await verifyPassword(currentPassword, user.hashedPassword)
  if (!valid) {
    return { ok: false, messageKey: 'auth.toast.invalidCurrentPassword' }
  }

  const policy = validatePasswordPolicy(newPassword)
  if (!policy.ok) {
    return { ok: false, messageKey: 'auth.toast.weakPassword' }
  }

  const hashed = await hashPassword(newPassword)
  const currentToken = await getCurrentSessionToken()
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed, passwordUpdatedAt: new Date() },
  })
  await invalidateOtherSessions(userId, currentToken)
  return { ok: true, messageKey: 'auth.toast.passwordChanged' }
}

export async function setPasswordAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, messageKey: 'auth.toast.unauthenticated' }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { ok: false, messageKey: 'auth.toast.unauthenticated' }
  if (user.hashedPassword) {
    return { ok: false, messageKey: 'auth.toast.passwordAlreadySet' }
  }

  const token = String(fd.get('token') ?? '')
  const otp = String(fd.get('otp') ?? '')
  const newPassword = String(fd.get('newPassword') ?? '')

  if (!token || !otp) {
    return { ok: false, messageKey: 'auth.toast.stepUpRequired' }
  }

  const consumed = await consumeSensitiveActionToken({
    token,
    otp,
    userId,
    action: ACTION,
    subjectId: userId,
  })
  if (!consumed) {
    return { ok: false, messageKey: 'auth.toast.stepUpRequired' }
  }

  const policy = validatePasswordPolicy(newPassword)
  if (!policy.ok) {
    return { ok: false, messageKey: 'auth.toast.weakPassword' }
  }

  const hashed = await hashPassword(newPassword)
  const currentToken = await getCurrentSessionToken()
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed, passwordUpdatedAt: new Date() },
  })
  await invalidateOtherSessions(userId, currentToken)
  return { ok: true, messageKey: 'auth.toast.passwordSet' }
}

/**
 * Initiates the step-up flow for set-password. Issues a SensitiveActionToken
 * and emails the OTP to the user. The opaque `token` is returned via
 * ActionResult.vars so the UI can carry it to the submit (hidden input).
 */
export async function requestSetPasswordStepUpAction(): Promise<ActionResult> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false, messageKey: 'auth.toast.unauthenticated' }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { ok: false, messageKey: 'auth.toast.unauthenticated' }
  if (user.hashedPassword) {
    return { ok: false, messageKey: 'auth.toast.passwordAlreadySet' }
  }

  const issued = await issueSensitiveActionToken({
    userId,
    action: ACTION,
    subjectId: userId,
  })
  await sendEmail({
    to: user.email,
    subject: 'Your one-time code',
    html: `<p>Your one-time code: <strong>${issued.otp}</strong>. Expires in 10 minutes.</p>`,
  })
  return {
    ok: true,
    messageKey: 'auth.toast.stepUpSent',
    vars: { token: issued.token },
  }
}
