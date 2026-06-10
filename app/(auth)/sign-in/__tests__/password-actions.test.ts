import { hashPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/db/client'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { resetRateLimits } from '@/lib/rate-limit'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: (n: string, v: string) => cookieStore.set(n, v),
    get: () => undefined,
  })),
  headers: vi.fn(async () => ({ get: () => '1.2.3.4' })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((u: string) => {
    throw new Error(`REDIRECT:${u}`)
  }),
}))

beforeEach(async () => {
  await cleanDb()
  cookieStore.clear()
  resetRateLimits()
})

async function makeUser(opts: { verified: boolean; password?: string }) {
  return prisma.user.create({
    data: {
      email: `u-${Date.now()}-${Math.random()}@t.com`,
      emailVerified: opts.verified ? new Date() : null,
      hashedPassword: opts.password ? await hashPassword(opts.password) : null,
    },
  })
}

describe('passwordSignInAction', () => {
  it('credenciales válidas + verificado → ok + sesión', async () => {
    const u = await makeUser({ verified: true, password: 'Abcd1234' })
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('email', u.email)
    fd.set('password', 'Abcd1234')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(1)
  })

  it('password incorrecta → error genérico, sin sesión', async () => {
    const u = await makeUser({ verified: true, password: 'Abcd1234' })
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('email', u.email)
    fd.set('password', 'WRONGpass1')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.invalidCredentials' })
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0)
  })

  it('email inexistente → mismo error genérico', async () => {
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('email', 'nope@t.com')
    fd.set('password', 'Abcd1234')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.invalidCredentials' })
  })

  it('email no verificado → bloqueado', async () => {
    const u = await makeUser({ verified: false, password: 'Abcd1234' })
    const { passwordSignInAction } = await import('../password-actions')
    const fd = new FormData()
    fd.set('email', u.email)
    fd.set('password', 'Abcd1234')
    const r = await passwordSignInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.emailNotVerified' })
  })
})
