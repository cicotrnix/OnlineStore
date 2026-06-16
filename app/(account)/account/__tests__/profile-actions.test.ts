import { prisma } from '@/lib/db/client'
import { INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.fn(async () => ({ user: { id: 'placeholder' } }) as { user?: { id: string } })
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))

beforeEach(async () => {
  await cleanDb()
})

async function makeUser() {
  const u = await prisma.user.create({
    data: {
      email: `p-${Date.now()}-${Math.random()}@t.com`,
      name: 'Old Name',
      preferredLocale: 'en-US',
    },
  })
  authMock.mockResolvedValue({ user: { id: u.id } })
  return u
}

describe('updateProfileAction', () => {
  it('valid name + locale → ok, persists both', async () => {
    const u = await makeUser()
    const { updateProfileAction } = await import('../profile/actions')
    const fd = new FormData()
    fd.set('name', 'New Name')
    fd.set('locale', 'es-419')
    const r = await updateProfileAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(true)
    const fresh = await prisma.user.findUnique({ where: { id: u.id } })
    expect(fresh?.name).toBe('New Name')
    expect(fresh?.preferredLocale).toBe('es-419')
  })

  it('invalid locale → error, no change', async () => {
    const u = await makeUser()
    const { updateProfileAction } = await import('../profile/actions')
    const fd = new FormData()
    fd.set('name', 'New Name')
    fd.set('locale', 'fr-FR')
    const r = await updateProfileAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
    const fresh = await prisma.user.findUnique({ where: { id: u.id } })
    expect(fresh?.name).toBe('Old Name')
    expect(fresh?.preferredLocale).toBe('en-US')
  })

  it('empty name → error, no change', async () => {
    const u = await makeUser()
    const { updateProfileAction } = await import('../profile/actions')
    const fd = new FormData()
    fd.set('name', '   ')
    fd.set('locale', 'en-US')
    const r = await updateProfileAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
    const fresh = await prisma.user.findUnique({ where: { id: u.id } })
    expect(fresh?.name).toBe('Old Name')
  })

  it('unauthenticated → error', async () => {
    authMock.mockResolvedValue({ user: undefined })
    const { updateProfileAction } = await import('../profile/actions')
    const fd = new FormData()
    fd.set('name', 'X')
    fd.set('locale', 'en-US')
    const r = await updateProfileAction(INITIAL_ACTION_RESULT, fd)
    expect(r.ok).toBe(false)
  })
})
