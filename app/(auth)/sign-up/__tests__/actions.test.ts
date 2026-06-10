import { prisma } from '@/lib/db/client'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { resetRateLimits } from '@/lib/rate-limit'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn(async () => undefined)
vi.mock('@/lib/auth', () => ({ signIn: signInMock }))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: () => '1.2.3.4' })),
}))

beforeEach(async () => {
  await cleanDb()
  signInMock.mockClear()
  resetRateLimits()
})

describe('signUpAction', () => {
  it('email nuevo → crea user con hash + dispara magic link', async () => {
    const { signUpAction } = await import('../actions')
    const fd = new FormData()
    fd.set('email', 'new@t.com')
    fd.set('password', 'Abcd1234')
    const r = await signUpAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    const u = await prisma.user.findUnique({ where: { email: 'new@t.com' } })
    expect(u?.hashedPassword).toBeTruthy()
    expect(u?.emailVerified).toBeNull()
    expect(signInMock).toHaveBeenCalledWith('resend', { email: 'new@t.com', redirect: false })
  })

  it('email ya existe → rebota sin pisar la row', async () => {
    await prisma.user.create({
      data: { email: 'taken@t.com', emailVerified: new Date() },
    })
    const { signUpAction } = await import('../actions')
    const fd = new FormData()
    fd.set('email', 'taken@t.com')
    fd.set('password', 'Abcd1234')
    const r = await signUpAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.accountExists' })
    const u = await prisma.user.findUnique({ where: { email: 'taken@t.com' } })
    expect(u?.hashedPassword).toBeNull() // NO se pisó
    expect(signInMock).not.toHaveBeenCalled()
  })

  it('política inválida → error', async () => {
    const { signUpAction } = await import('../actions')
    const fd = new FormData()
    fd.set('email', 'x@t.com')
    fd.set('password', 'short')
    const r = await signUpAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
    expect(r.messageKey).toBe('auth.toast.weakPassword')
  })
})
