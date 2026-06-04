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
  it('admin aprueba org PENDING → VERIFIED + customer.verified emitido + redirect ?flash=approved', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    const { approveOrganizationAction } = await import('../_actions')
    await expect(approveOrganizationAction(fd)).rejects.toThrow(
      `REDIRECT:/admin/customers/${org.id}?flash=approved`
    )
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('VERIFIED')
    expect(o.taxExempt).toBe(true)
    const ev = await prisma.domainEvent.findFirstOrThrow({ where: { type: 'customer.verified' } })
    expect((ev.payload as { organizationId: string }).organizationId).toBe(org.id)
  })

  it('admin clickea Aprobar 2 veces → segundo redirect ?flash=approved-noop, no doble evento', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    const { approveOrganizationAction } = await import('../_actions')
    await expect(approveOrganizationAction(fd)).rejects.toThrow(/flash=approved$/)
    await expect(approveOrganizationAction(fd)).rejects.toThrow(/flash=approved-noop$/)
    const events = await prisma.domainEvent.findMany({ where: { type: 'customer.verified' } })
    expect(events).toHaveLength(1)
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
  it('admin rechaza con motivo → REJECTED + customer.rejected emitido + redirect ?flash=rejected', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    fd.set('reason', 'Certificado vencido')
    const { rejectOrganizationAction } = await import('../_actions')
    await expect(rejectOrganizationAction(fd)).rejects.toThrow(/flash=rejected$/)
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('REJECTED')
    expect(o.rejectionReason).toBe('Certificado vencido')
    const ev = await prisma.domainEvent.findFirstOrThrow({ where: { type: 'customer.rejected' } })
    expect((ev.payload as { reason: string }).reason).toBe('Certificado vencido')
  })

  it('admin clickea Rechazar 2 veces con mismo motivo → redirect ?flash=rejected-noop, no doble evento', async () => {
    const { org } = await setup()
    const fd = new FormData()
    fd.set('organizationId', org.id)
    fd.set('reason', 'Certificado vencido')
    const { rejectOrganizationAction } = await import('../_actions')
    await expect(rejectOrganizationAction(fd)).rejects.toThrow(/flash=rejected$/)
    await expect(rejectOrganizationAction(fd)).rejects.toThrow(/flash=rejected-noop$/)
    const events = await prisma.domainEvent.findMany({ where: { type: 'customer.rejected' } })
    expect(events).toHaveLength(1)
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
