import { prisma } from '@/lib/db/client'
import { _resetFakeStorage } from '@/lib/storage'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'admin@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))
vi.mock('@/lib/auth/actions', () => ({
  impersonationStart: vi.fn(),
  impersonationStop: vi.fn(),
  switchActiveOrg: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

beforeEach(async () => {
  await cleanDb()
  _resetFakeStorage()
})

async function setup(opts: { adminUser?: boolean } = { adminUser: true }) {
  const admin = await prisma.user.create({
    data: {
      email: `adm-${Date.now()}-${Math.random()}@t.com`,
      isPlatformAdmin: opts.adminUser ?? true,
    },
  })
  authUser.id = admin.id
  authUser.email = admin.email
  const org = await prisma.organization.create({
    data: {
      name: 'Pending Co',
      slug: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: 'PENDING',
    },
  })
  return { admin, org }
}

describe('approveOrganizationAction', () => {
  it('admin aprueba org PENDING → VERIFIED + customer.verified emitido', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    const { approveOrganizationAction } = await import('../_actions')
    await approveOrganizationAction(fd)
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('VERIFIED')
    expect(o.taxExempt).toBe(true)
    const ev = await prisma.domainEvent.findFirstOrThrow({ where: { type: 'customer.verified' } })
    expect((ev.payload as { organizationId: string }).organizationId).toBe(org.id)
  })

  it('non-admin → Forbidden', async () => {
    const { org } = await setup({ adminUser: false })
    const fd = new FormData()
    fd.set('organizationId', org.id)
    const { approveOrganizationAction } = await import('../_actions')
    await expect(approveOrganizationAction(fd)).rejects.toThrow(/Forbidden/)
  })
})

describe('rejectOrganizationAction', () => {
  it('admin rechaza con motivo → REJECTED + rejectionReason + customer.rejected emitido', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    fd.set('reason', 'Certificado vencido')
    const { rejectOrganizationAction } = await import('../_actions')
    await rejectOrganizationAction(fd)
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('REJECTED')
    expect(o.rejectionReason).toBe('Certificado vencido')
    const ev = await prisma.domainEvent.findFirstOrThrow({ where: { type: 'customer.rejected' } })
    expect((ev.payload as { reason: string }).reason).toBe('Certificado vencido')
  })

  it('motivo vacío → throw', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    fd.set('reason', '   ')
    const { rejectOrganizationAction } = await import('../_actions')
    await expect(rejectOrganizationAction(fd)).rejects.toThrow(/motivo obligatorio/i)
  })
})
