import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sessionRef: {
  value: {
    user?: { id: string }
    activeOrgId?: string | null
    impersonatingOrgId?: string | null
  } | null
} = {
  value: null,
}

vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn(async () => sessionRef.value),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

beforeEach(async () => {
  await cleanDb()
  sessionRef.value = null
})

async function makeUser() {
  return prisma.user.create({ data: { email: `u-${Date.now()}-${Math.random()}@t.com` } })
}

async function makeOrg(slug: string) {
  return prisma.organization.create({ data: { name: 'O', slug: `${slug}-${Date.now()}` } })
}

async function addMember(userId: string, orgId: string) {
  return prisma.organizationMember.create({
    data: { organizationId: orgId, userId, role: 'OWNER' },
  })
}

describe('resolveActiveOrgId', () => {
  it('null si no hay sesión', async () => {
    sessionRef.value = null
    const { resolveActiveOrgId } = await import('../active-org')
    expect(await resolveActiveOrgId()).toBe(null)
  })

  it('impersonation gana sobre activeOrgId', async () => {
    const u = await makeUser()
    const a = await makeOrg('a')
    const b = await makeOrg('b')
    sessionRef.value = { user: { id: u.id }, activeOrgId: a.id, impersonatingOrgId: b.id }
    const { resolveActiveOrgId } = await import('../active-org')
    expect(await resolveActiveOrgId()).toBe(b.id)
  })

  it('activeOrgId explícito gana sobre auto-pick', async () => {
    const u = await makeUser()
    const a = await makeOrg('a')
    sessionRef.value = { user: { id: u.id }, activeOrgId: a.id }
    const { resolveActiveOrgId } = await import('../active-org')
    expect(await resolveActiveOrgId()).toBe(a.id)
  })

  it('única membresía + sin activeOrgId → auto-pick', async () => {
    const u = await makeUser()
    const a = await makeOrg('a')
    await addMember(u.id, a.id)
    sessionRef.value = { user: { id: u.id }, activeOrgId: null }
    const { resolveActiveOrgId } = await import('../active-org')
    expect(await resolveActiveOrgId()).toBe(a.id)
  })

  it('cero membresías + sin activeOrgId → null', async () => {
    const u = await makeUser()
    sessionRef.value = { user: { id: u.id }, activeOrgId: null }
    const { resolveActiveOrgId } = await import('../active-org')
    expect(await resolveActiveOrgId()).toBe(null)
  })

  it('múltiples membresías sin activeOrgId → null (el caller decide)', async () => {
    const u = await makeUser()
    const a = await makeOrg('a')
    const b = await makeOrg('b')
    await addMember(u.id, a.id)
    await addMember(u.id, b.id)
    sessionRef.value = { user: { id: u.id }, activeOrgId: null }
    const { resolveActiveOrgId } = await import('../active-org')
    expect(await resolveActiveOrgId()).toBe(null)
  })
})

describe('requireActiveOrgId', () => {
  it('devuelve el orgId resuelto', async () => {
    const u = await makeUser()
    const a = await makeOrg('a')
    await addMember(u.id, a.id)
    sessionRef.value = { user: { id: u.id }, activeOrgId: null }
    const { requireActiveOrgId } = await import('../active-org')
    expect(await requireActiveOrgId()).toBe(a.id)
  })

  it('redirige a /select-org si no se puede resolver (varias sin elegir)', async () => {
    const u = await makeUser()
    const a = await makeOrg('a')
    const b = await makeOrg('b')
    await addMember(u.id, a.id)
    await addMember(u.id, b.id)
    sessionRef.value = { user: { id: u.id }, activeOrgId: null }
    const { requireActiveOrgId } = await import('../active-org')
    await expect(requireActiveOrgId()).rejects.toThrow(/REDIRECT:\/select-org/)
  })
})
