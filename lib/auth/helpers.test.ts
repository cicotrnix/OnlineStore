import { redirect } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from './config'
import { getCurrentUser, requireAuth } from './helpers'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('./config', () => ({ auth: vi.fn() }))

describe('getCurrentUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user when session exists', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    } as never)
    const user = await getCurrentUser()
    expect(user).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('returns null when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user when authed', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
    } as never)
    const user = await requireAuth()
    expect(user.id).toBe('u1')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects to /sign-in when not authed', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    await requireAuth()
    expect(redirect).toHaveBeenCalledWith('/sign-in')
  })
})
