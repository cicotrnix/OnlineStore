import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { resetRateLimits } from '@/lib/rate-limit'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  signIn: signInMock,
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: (_name: string) => '1.2.3.4' })),
}))

beforeEach(() => {
  signInMock.mockReset()
  resetRateLimits()
})

describe('signInAction', () => {
  it('happy path → { ok: true, messageKey: auth.toast.linkSent }', async () => {
    signInMock.mockResolvedValueOnce(undefined)
    const fd = new FormData()
    fd.set('email', 'buyer@example.com')
    const { signInAction } = await import('../actions')
    const r = await signInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: true, messageKey: 'auth.toast.linkSent' })
    expect(signInMock).toHaveBeenCalledWith('resend', {
      email: 'buyer@example.com',
      redirect: false,
    })
  })

  it('email vacío → { ok: false, messageKey: auth.toast.linkFailed }, sin llamar signIn', async () => {
    const fd = new FormData()
    fd.set('email', '   ')
    const { signInAction } = await import('../actions')
    const r = await signInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.linkFailed' })
    expect(signInMock).not.toHaveBeenCalled()
  })

  it('signIn throws (provider rechazó) → { ok: false, messageKey: auth.toast.linkFailed }', async () => {
    signInMock.mockRejectedValueOnce(new Error('Resend down'))
    const fd = new FormData()
    fd.set('email', 'x@y.com')
    const { signInAction } = await import('../actions')
    const r = await signInAction(INITIAL_ACTION_RESULT, fd)
    expect(r).toEqual({ ok: false, messageKey: 'auth.toast.linkFailed' })
  })

  it('4ta llamada en el mismo minuto → rateLimited, sin invocar signIn', async () => {
    signInMock.mockResolvedValue(undefined)
    const { signInAction } = await import('../actions')
    const buildForm = () => {
      const fd = new FormData()
      fd.set('email', 'buyer@example.com')
      return fd
    }
    for (let i = 0; i < 3; i++) {
      const r = await signInAction(INITIAL_ACTION_RESULT, buildForm())
      expect(r).toEqual({ ok: true, messageKey: 'auth.toast.linkSent' })
    }
    expect(signInMock).toHaveBeenCalledTimes(3)
    const r4 = await signInAction(INITIAL_ACTION_RESULT, buildForm())
    expect(r4).toEqual({ ok: false, messageKey: 'auth.toast.rateLimited' })
    expect(signInMock).toHaveBeenCalledTimes(3)
  })
})
