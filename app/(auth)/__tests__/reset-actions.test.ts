import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { generateResetToken, hashResetToken } from '@/lib/auth/password-reset'
import { prisma } from '@/lib/db/client'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { resetRateLimits } from '@/lib/rate-limit'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// createDbSession sets the session cookie; capture it in an in-memory store.
const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (n: string) => (cookieStore.has(n) ? { value: cookieStore.get(n)! } : undefined),
    set: (n: string, v: string) => cookieStore.set(n, v),
  })),
  headers: vi.fn(async () => ({ get: () => '1.2.3.4' })),
}))

const sendEmailMock = vi.fn(async (_args: { to: string; subject: string; html: string }) => ({
  id: 'noop',
}))
vi.mock('@/lib/email/resend', () => ({ sendEmail: sendEmailMock }))

beforeEach(async () => {
  await cleanDb()
  cookieStore.clear()
  resetRateLimits()
  sendEmailMock.mockClear()
})

async function makeUser(opts: { password?: string; emailVerified?: boolean } = {}) {
  return prisma.user.create({
    data: {
      email: `u-${Date.now()}-${Math.random()}@t.com`,
      emailVerified: opts.emailVerified === false ? null : new Date(),
      hashedPassword: opts.password ? await hashPassword(opts.password) : null,
    },
  })
}

async function seedToken(userId: string, opts: { expiresAt?: Date; usedAt?: Date } = {}) {
  const raw = generateResetToken()
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashResetToken(raw),
      expiresAt: opts.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      ...(opts.usedAt ? { usedAt: opts.usedAt } : {}),
    },
  })
  return raw
}

describe('requestPasswordResetAction', () => {
  it('user does not exist → neutral ok response, NO token created', async () => {
    const { requestPasswordResetAction } = await import('../forgot-password/actions')
    const fd = new FormData()
    fd.set('email', 'nobody@nowhere.com')
    const r = await requestPasswordResetAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: true, messageKey: 'auth.toast.resetLinkSent' })
    expect(await prisma.passwordResetToken.count()).toBe(0)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('user exists → same neutral response, exactly one unused token, email sent', async () => {
    const user = await makeUser({ password: 'Oldpass1' })
    const { requestPasswordResetAction } = await import('../forgot-password/actions')
    const fd = new FormData()
    fd.set('email', user.email)
    const r = await requestPasswordResetAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: true, messageKey: 'auth.toast.resetLinkSent' })
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } })
    expect(tokens).toHaveLength(1)
    expect(tokens[0]?.usedAt).toBeNull()
    expect(sendEmailMock).toHaveBeenCalledOnce()
  })

  it('invalidates prior unused tokens before creating a new one', async () => {
    const user = await makeUser({ password: 'Oldpass1' })
    const oldRaw = await seedToken(user.id)
    const oldHash = hashResetToken(oldRaw)
    const { requestPasswordResetAction } = await import('../forgot-password/actions')
    const fd = new FormData()
    fd.set('email', user.email)
    await requestPasswordResetAction(INITIAL_ACTION_RESULT, fd)
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } })
    expect(tokens).toHaveLength(1)
    expect(tokens[0]?.tokenHash).not.toBe(oldHash)
  })

  it('email lookup is case-insensitive', async () => {
    const user = await makeUser({ password: 'Oldpass1' })
    const { requestPasswordResetAction } = await import('../forgot-password/actions')
    const fd = new FormData()
    fd.set('email', user.email.toUpperCase())
    await requestPasswordResetAction(INITIAL_ACTION_RESULT, fd)
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(1)
  })
})

describe('resetPasswordAction', () => {
  it('valid token + strong password → ok, password set, token consumed, ALL sessions revoked + fresh one minted', async () => {
    const user = await makeUser({ password: 'Oldpass1', emailVerified: false })
    await prisma.session.createMany({
      data: [
        { userId: user.id, sessionToken: 'sess-a', expires: new Date(Date.now() + 1e9) },
        { userId: user.id, sessionToken: 'sess-b', expires: new Date(Date.now() + 1e9) },
      ],
    })
    const raw = await seedToken(user.id)
    const { resetPasswordAction } = await import('../reset-password/[token]/actions')
    const fd = new FormData()
    fd.set('token', raw)
    fd.set('newPassword', 'Brandnew1')
    const r = await resetPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: true, messageKey: 'auth.toast.passwordReset' })

    const fresh = await prisma.user.findUnique({ where: { id: user.id } })
    expect(await verifyPassword('Brandnew1', fresh!.hashedPassword!)).toBe(true)
    expect(fresh?.passwordUpdatedAt).toBeInstanceOf(Date)
    expect(fresh?.emailVerified).toBeInstanceOf(Date) // backfilled on reset

    const usedToken = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } })
    expect(usedToken?.usedAt).toBeInstanceOf(Date)

    // Old sessions gone, exactly one new session present.
    const sessions = await prisma.session.findMany({ where: { userId: user.id } })
    expect(sessions).toHaveLength(1)
    expect(['sess-a', 'sess-b']).not.toContain(sessions[0]?.sessionToken)
  })

  it('weak password → error, token NOT consumed (not burned)', async () => {
    const user = await makeUser({ password: 'Oldpass1' })
    const before = await prisma.user.findUnique({ where: { id: user.id } })
    const raw = await seedToken(user.id)
    const { resetPasswordAction } = await import('../reset-password/[token]/actions')
    const fd = new FormData()
    fd.set('token', raw)
    fd.set('newPassword', 'short')
    const r = await resetPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.weakPassword' })
    const after = await prisma.user.findUnique({ where: { id: user.id } })
    expect(after?.hashedPassword).toBe(before?.hashedPassword)
    const tok = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } })
    expect(tok?.usedAt).toBeNull()
  })

  it('already-used token → invalid, no change', async () => {
    const user = await makeUser({ password: 'Oldpass1' })
    const before = await prisma.user.findUnique({ where: { id: user.id } })
    const raw = await seedToken(user.id, { usedAt: new Date() })
    const { resetPasswordAction } = await import('../reset-password/[token]/actions')
    const fd = new FormData()
    fd.set('token', raw)
    fd.set('newPassword', 'Brandnew1')
    const r = await resetPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.resetTokenInvalid' })
    const after = await prisma.user.findUnique({ where: { id: user.id } })
    expect(after?.hashedPassword).toBe(before?.hashedPassword)
  })

  it('expired token → invalid, no change', async () => {
    const user = await makeUser({ password: 'Oldpass1' })
    const raw = await seedToken(user.id, { expiresAt: new Date(Date.now() - 1000) })
    const { resetPasswordAction } = await import('../reset-password/[token]/actions')
    const fd = new FormData()
    fd.set('token', raw)
    fd.set('newPassword', 'Brandnew1')
    const r = await resetPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.resetTokenInvalid' })
  })

  it('unknown/garbage token → invalid', async () => {
    await makeUser({ password: 'Oldpass1' })
    const { resetPasswordAction } = await import('../reset-password/[token]/actions')
    const fd = new FormData()
    fd.set('token', 'not-a-real-token')
    fd.set('newPassword', 'Brandnew1')
    const r = await resetPasswordAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.resetTokenInvalid' })
  })
})
