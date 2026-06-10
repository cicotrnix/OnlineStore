import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/db/client'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { issueSensitiveActionToken } from '@/modules/payments/step-up'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `auth()` returns the current session's user.
const authMock = vi.fn(async () => ({ user: { id: 'placeholder' } }))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))

const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (n: string) => (cookieStore.has(n) ? { value: cookieStore.get(n)! } : undefined),
    set: (n: string, v: string) => cookieStore.set(n, v),
  })),
  headers: vi.fn(async () => ({ get: () => '1.2.3.4' })),
}))

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(async () => ({ id: 'noop' })),
}))

beforeEach(async () => {
  await cleanDb()
  cookieStore.clear()
})

async function seedUserWithSession(opts: { password?: string }) {
  const u = await prisma.user.create({
    data: {
      email: `u-${Date.now()}-${Math.random()}@t.com`,
      emailVerified: new Date(),
      hashedPassword: opts.password ? await hashPassword(opts.password) : null,
    },
  })
  const tokenCurrent = `cur-${Math.random()}`
  const tokenOther = `oth-${Math.random()}`
  await prisma.session.createMany({
    data: [
      { userId: u.id, sessionToken: tokenCurrent, expires: new Date(Date.now() + 1e9) },
      { userId: u.id, sessionToken: tokenOther, expires: new Date(Date.now() + 1e9) },
    ],
  })
  cookieStore.set('authjs.session-token', tokenCurrent)
  authMock.mockResolvedValue({ user: { id: u.id } } as never)
  return { user: u, tokenCurrent, tokenOther }
}

describe('changePasswordAction', () => {
  it('happy path: verifies current, updates hash, sets passwordUpdatedAt, invalidates other sessions', async () => {
    const { user, tokenCurrent, tokenOther } = await seedUserWithSession({ password: 'Oldpass1' })
    const { changePasswordAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('currentPassword', 'Oldpass1')
    fd.set('newPassword', 'Newpass1')
    const r = await changePasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    const fresh = await prisma.user.findUnique({ where: { id: user.id } })
    expect(fresh?.hashedPassword).toBeTruthy()
    expect(await verifyPassword('Newpass1', fresh!.hashedPassword!)).toBe(true)
    expect(fresh?.passwordUpdatedAt).toBeInstanceOf(Date)
    // Current session stays, other session deleted
    const remaining = await prisma.session.findMany({ where: { userId: user.id } })
    expect(remaining.map((s) => s.sessionToken)).toEqual([tokenCurrent])
    expect(remaining.find((s) => s.sessionToken === tokenOther)).toBeUndefined()
  })

  it('wrong current password → invalidCurrentPassword, no changes', async () => {
    const { user, tokenOther } = await seedUserWithSession({ password: 'Oldpass1' })
    const before = await prisma.user.findUnique({ where: { id: user.id } })
    const { changePasswordAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('currentPassword', 'WRONGpass1')
    fd.set('newPassword', 'Newpass1')
    const r = await changePasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.invalidCurrentPassword' })
    const after = await prisma.user.findUnique({ where: { id: user.id } })
    expect(after?.hashedPassword).toBe(before?.hashedPassword)
    expect(after?.passwordUpdatedAt).toBeNull()
    // Other session still present (no invalidation)
    const otherStill = await prisma.session.findUnique({ where: { sessionToken: tokenOther } })
    expect(otherStill).not.toBeNull()
  })

  it('weak new password → weakPassword, no changes', async () => {
    const { user } = await seedUserWithSession({ password: 'Oldpass1' })
    const before = await prisma.user.findUnique({ where: { id: user.id } })
    const { changePasswordAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('currentPassword', 'Oldpass1')
    fd.set('newPassword', 'short')
    const r = await changePasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.weakPassword' })
    const after = await prisma.user.findUnique({ where: { id: user.id } })
    expect(after?.hashedPassword).toBe(before?.hashedPassword)
    expect(after?.passwordUpdatedAt).toBeNull()
  })
})

describe('setPasswordAction', () => {
  it('user without password + valid step-up token+OTP → ok, hash set, sessions invalidated', async () => {
    const { user, tokenCurrent, tokenOther } = await seedUserWithSession({})
    const issued = await issueSensitiveActionToken({
      userId: user.id,
      action: 'set_password',
      subjectId: user.id,
    })
    const { setPasswordAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('token', issued.token)
    fd.set('otp', issued.otp)
    fd.set('newPassword', 'Newpass1')
    const r = await setPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    const fresh = await prisma.user.findUnique({ where: { id: user.id } })
    expect(fresh?.hashedPassword).toBeTruthy()
    expect(await verifyPassword('Newpass1', fresh!.hashedPassword!)).toBe(true)
    expect(fresh?.passwordUpdatedAt).toBeInstanceOf(Date)
    const remaining = await prisma.session.findMany({ where: { userId: user.id } })
    expect(remaining.map((s) => s.sessionToken)).toEqual([tokenCurrent])
    expect(remaining.find((s) => s.sessionToken === tokenOther)).toBeUndefined()
  })

  it('without step-up token (missing/invalid) → stepUpRequired, no changes', async () => {
    const { user } = await seedUserWithSession({})
    const { setPasswordAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('token', 'bogus')
    fd.set('otp', '000000')
    fd.set('newPassword', 'Newpass1')
    const r = await setPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.stepUpRequired' })
    const after = await prisma.user.findUnique({ where: { id: user.id } })
    expect(after?.hashedPassword).toBeNull()
    expect(after?.passwordUpdatedAt).toBeNull()
  })

  it('user already has a password → passwordAlreadySet, no changes', async () => {
    const { user } = await seedUserWithSession({ password: 'Oldpass1' })
    const before = await prisma.user.findUnique({ where: { id: user.id } })
    const issued = await issueSensitiveActionToken({
      userId: user.id,
      action: 'set_password',
      subjectId: user.id,
    })
    const { setPasswordAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('token', issued.token)
    fd.set('otp', issued.otp)
    fd.set('newPassword', 'Newpass1')
    const r = await setPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.passwordAlreadySet' })
    const after = await prisma.user.findUnique({ where: { id: user.id } })
    expect(after?.hashedPassword).toBe(before?.hashedPassword)
  })

  it('weak new password → weakPassword BEFORE consuming the OTP (token stays usable)', async () => {
    const { user } = await seedUserWithSession({})
    const issued = await issueSensitiveActionToken({
      userId: user.id,
      action: 'set_password',
      subjectId: user.id,
    })
    const { setPasswordAction } = await import('../password-actions')

    // First attempt: weak password. Token must NOT be consumed.
    const fdWeak = new FormData()
    fdWeak.set('token', issued.token)
    fdWeak.set('otp', issued.otp)
    fdWeak.set('newPassword', 'short')
    const r1 = await setPasswordAction(INITIAL_ACTION_RESULT, fdWeak)
    expect(r1).toEqual({ ok: false, messageKey: 'auth.toast.weakPassword' })

    // Second attempt with the SAME token + OTP and a valid password must succeed.
    // If the token had been consumed in attempt 1, this would fail with stepUpRequired.
    const fdOk = new FormData()
    fdOk.set('token', issued.token)
    fdOk.set('otp', issued.otp)
    fdOk.set('newPassword', 'Newpass1')
    const r2 = await setPasswordAction(INITIAL_ACTION_RESULT, fdOk)
    expect(r2.ok).toBe(true)
    const fresh = await prisma.user.findUnique({ where: { id: user.id } })
    expect(fresh?.hashedPassword).toBeTruthy()
    expect(await verifyPassword('Newpass1', fresh!.hashedPassword!)).toBe(true)
  })
})
