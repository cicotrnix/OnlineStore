import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 's@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/auth/actions', () => ({
  switchActiveOrg: vi.fn(async (_orgId: string) => {}),
}))

beforeEach(async () => {
  await cleanDb()
})

async function makeUser() {
  const u = await prisma.user.create({
    data: { email: `so-${Date.now()}-${Math.random()}@t.com` },
  })
  authUser.id = u.id
  authUser.email = u.email
  return u
}

describe('SelectOrgPage — no-org redirect', () => {
  it('user sin organizaciones → redirect /onboarding (no muestra estado vacío)', async () => {
    await makeUser()
    const { default: SelectOrgPage } = await import('../page')
    await expect(SelectOrgPage()).rejects.toThrow(/REDIRECT:\/onboarding/)
  })

  it('user con 1 org → switchActiveOrg + redirect /catalog (regresión)', async () => {
    const u = await makeUser()
    const org = await prisma.organization.create({
      data: { name: 'Acme', slug: `acme-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: u.id, role: 'OWNER' },
    })
    const { default: SelectOrgPage } = await import('../page')
    await expect(SelectOrgPage()).rejects.toThrow(/REDIRECT:\/catalog/)
  })
})
