import { prisma } from '@/lib/db/client'
import { _resetFakeStorage } from '@/lib/storage'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = { id: 'placeholder', email: 'b@t.com' }
vi.mock('@/lib/auth/helpers', () => ({
  requireAuth: vi.fn(async () => authUser),
  getCurrentUser: vi.fn(async () => authUser),
}))

const switchActiveOrgMock = vi.fn(async (_orgId: string) => {})
vi.mock('@/lib/auth/actions', () => ({
  switchActiveOrg: switchActiveOrgMock,
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

beforeEach(async () => {
  await cleanDb()
  _resetFakeStorage()
  switchActiveOrgMock.mockClear()
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
  it('happy path → crea org PENDING + OWNER + taxId capturado + redirect /onboarding/pending', async () => {
    const u = await makeUser()
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(buildForm())).rejects.toThrow(
      /REDIRECT:\/onboarding\/pending\?toast=success&msg=onboarding\.toast\.submitted/
    )
    const org = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { userId: u.id } } },
    })
    expect(org.verificationStatus).toBe('PENDING')
    expect(org.verificationSubmittedAt).not.toBeNull()
    expect(org.country).toBe('US')
    // LATAM flow: taxId capturado, sin TaxDocument (la evidencia la sube el admin).
    expect(org.taxId).toBe('TX-1')
    expect(org.taxIdCountry).toBe('US')
    const docs = await prisma.taxDocument.count({ where: { organizationId: org.id } })
    expect(docs).toBe(0)
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { organizationId: org.id },
    })
    expect(member.role).toBe('OWNER')
    // B.3: la nueva org queda como activa (evita rebote por /select-org).
    expect(switchActiveOrgMock).toHaveBeenCalledWith(org.id)
  })

  it('usuario que ya tiene org → redirect con toast alreadyHasOrg', async () => {
    const u = await makeUser()
    const org = await prisma.organization.create({
      data: { name: 'Existing', slug: `e-${Date.now()}` },
    })
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: u.id, role: 'OWNER' },
    })
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(buildForm())).rejects.toThrow(
      /REDIRECT:\/onboarding\/pending\?toast=info&msg=onboarding\.toast\.alreadyHasOrg/
    )
  })

  it('country no ISO-2 → redirect con toast invalidCountry', async () => {
    await makeUser()
    const { submitOnboardingAction } = await import('../onboarding/_actions')
    await expect(submitOnboardingAction(buildForm({ country: 'USA' }))).rejects.toThrow(
      /REDIRECT:\/onboarding\?toast=error&msg=onboarding\.toast\.invalidCountry/
    )
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
    await expect(resubmitCertificateAction(fd)).rejects.toThrow(
      /REDIRECT:\/onboarding\/pending\?toast=success&msg=onboarding\.toast\.resubmitted/
    )
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('PENDING')
    expect(o.rejectionReason).toBeNull()
  })
})
