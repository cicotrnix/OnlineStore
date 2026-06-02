import { prisma } from '@/lib/db/client'
import { _resetFakeStorage } from '@/lib/storage'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'b@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

beforeEach(async () => {
  await cleanDb()
  _resetFakeStorage()
})

async function makeUser() {
  const u = await prisma.user.create({ data: { email: `o-${Date.now()}@t.com` } })
  authUser.id = u.id
  authUser.email = u.email
  return u
}

function buildForm(opts: Partial<Record<string, string>> = {}, file?: File): FormData {
  const fd = new FormData()
  fd.set('name', opts.name ?? 'Acme Repair Shop')
  fd.set('country', opts.country ?? 'US')
  fd.set('addressLine1', opts.addressLine1 ?? '123 Main')
  fd.set('city', opts.city ?? 'Austin')
  fd.set('state', opts.state ?? 'TX')
  fd.set('postalCode', opts.postalCode ?? '78701')
  fd.set('type', opts.type ?? 'US_RESALE_CERT')
  fd.set('number', opts.number ?? 'TX-1')
  fd.set('jurisdiction', opts.jurisdiction ?? 'TX')
  fd.set(
    'file',
    file ?? new File([new Uint8Array([1, 2, 3])], 'cert.pdf', { type: 'application/pdf' })
  )
  return fd
}

describe('submitOnboardingAction', () => {
  it('happy path → crea org PENDING + OWNER + TaxDocument + redirect /onboarding/pending', async () => {
    const u = await makeUser()
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(buildForm())).rejects.toThrow(
      'REDIRECT:/onboarding/pending'
    )
    const org = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { userId: u.id } } },
    })
    expect(org.verificationStatus).toBe('PENDING')
    expect(org.verificationSubmittedAt).not.toBeNull()
    expect(org.country).toBe('US')
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { organizationId: org.id },
    })
    expect(member.role).toBe('OWNER')
    const doc = await prisma.taxDocument.findFirstOrThrow({
      where: { organizationId: org.id },
    })
    expect(doc.status).toBe('UPLOADED')
  })

  it('usuario que ya tiene org → throw ALREADY_HAS_ORG', async () => {
    const u = await makeUser()
    const org = await prisma.organization.create({
      data: { name: 'Existing', slug: `e-${Date.now()}` },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: u.id, role: 'OWNER' },
    })
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(buildForm())).rejects.toThrow('ALREADY_HAS_ORG')
  })

  it('archivo vacío → throw', async () => {
    await makeUser()
    const fd = buildForm({}, new File([], 'empty.pdf', { type: 'application/pdf' }))
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(fd)).rejects.toThrow(/archivo/i)
  })

  it('country no ISO-2 → throw', async () => {
    await makeUser()
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(buildForm({ country: 'USA' }))).rejects.toThrow(/ISO-2/)
  })
})

describe('resubmitCertificateAction', () => {
  it('org REJECTED → upload reset a PENDING + limpia rejectionReason', async () => {
    const u = await makeUser()
    const org = await prisma.organization.create({
      data: {
        name: 'X',
        slug: `x-${Date.now()}`,
        verificationStatus: 'REJECTED',
        rejectionReason: 'old reason',
      },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: u.id, role: 'OWNER' },
    })
    const fd = new FormData()
    fd.set('type', 'US_RESALE_CERT')
    fd.set('number', 'TX-2')
    fd.set('jurisdiction', 'TX')
    fd.set('file', new File([new Uint8Array([1])], 'r.pdf', { type: 'application/pdf' }))
    const { resubmitCertificateAction } = await import('../onboarding/_actions')
    await expect(resubmitCertificateAction(fd)).rejects.toThrow('REDIRECT:/onboarding/pending')
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('PENDING')
    expect(o.rejectionReason).toBeNull()
  })
})
