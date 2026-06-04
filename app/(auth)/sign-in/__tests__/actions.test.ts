import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  signIn: signInMock,
}))

beforeEach(() => {
  signInMock.mockReset()
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
})
