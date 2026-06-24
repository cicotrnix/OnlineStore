import { prisma } from '@/lib/db/client'
import { _resetFakeStorage, _setStorageClient, getStorage } from '@/lib/storage'
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
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

async function makeAdminOrg(): Promise<{ orgId: string }> {
  const admin = await prisma.user.create({
    data: { email: `adm-${Date.now()}@t.com`, isPlatformAdmin: true },
  })
  authUser.id = admin.id
  authUser.email = admin.email
  const org = await prisma.organization.create({
    data: {
      name: 'O',
      slug: `o-${Date.now()}`,
      verificationStatus: 'PENDING',
    },
  })
  return { orgId: org.id }
}

beforeEach(async () => {
  await cleanDb()
  _resetFakeStorage()
})

describe('verifyOrganizationAction (legacy uploadTaxCertificateAction replaced)', () => {
  it('admin sube screenshot de registro → VERIFIED + TaxDocument + emite customer.verified', async () => {
    const { orgId } = await makeAdminOrg()
    await prisma.organization.update({
      where: { id: orgId },
      data: { taxId: 'TX-12345', taxIdCountry: 'US' },
    })
    const fd = new FormData()
    fd.set('organizationId', orgId)
    fd.set('docType', 'BUSINESS_REGISTRY_PROOF')
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'registry.png', { type: 'image/png' })
    fd.set('file', file)

    const { verifyOrganizationAction } = await import('../_actions')
    await expect(verifyOrganizationAction(fd)).rejects.toThrow(
      /REDIRECT:.+toast=success&msg=admin\.toast\.verified/
    )

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } })
    expect(org.verificationStatus).toBe('VERIFIED')
    expect(org.verifiedAt).not.toBeNull()

    const doc = await prisma.taxDocument.findFirstOrThrow({ where: { organizationId: orgId } })
    expect(doc.type).toBe('BUSINESS_REGISTRY_PROOF')
    expect(doc.status).toBe('APPROVED')

    const stored = await getStorage().get(doc.fileKey)
    expect(stored).not.toBeNull()
    expect(Array.from(stored!)).toEqual([1, 2, 3, 4])

    const ev = await prisma.domainEvent.findFirst({ where: { type: 'customer.verified' } })
    expect(ev).not.toBeNull()
    expect((ev?.payload as { organizationId: string }).organizationId).toBe(orgId)
  })

  it('archivo vacío → redirect error evidenceRequired', async () => {
    const { orgId } = await makeAdminOrg()
    const fd = new FormData()
    fd.set('organizationId', orgId)
    fd.set('docType', 'BUSINESS_REGISTRY_PROOF')
    fd.set('file', new File([], 'empty.png'))
    const { verifyOrganizationAction } = await import('../_actions')
    await expect(verifyOrganizationAction(fd)).rejects.toThrow(
      /REDIRECT:.+toast=error&msg=admin\.toast\.evidenceRequired/
    )
  })

  it('non-admin no puede verificar', async () => {
    const buyer = await prisma.user.create({
      data: { email: `b-${Date.now()}@t.com`, isPlatformAdmin: false },
    })
    authUser.id = buyer.id
    authUser.email = buyer.email
    const org = await prisma.organization.create({
      data: { name: 'O', slug: `o2-${Date.now()}`, verificationStatus: 'PENDING' },
    })
    const fd = new FormData()
    fd.set('organizationId', org.id)
    fd.set('docType', 'BUSINESS_REGISTRY_PROOF')
    fd.set('file', new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    const { verifyOrganizationAction } = await import('../_actions')
    await expect(verifyOrganizationAction(fd)).rejects.toThrow(/Forbidden/)
  })
})

describe('getTaxCertificateUrlAction', () => {
  it('admin obtiene signed URL del fileKey', async () => {
    const { orgId } = await makeAdminOrg()
    const doc = await prisma.taxDocument.create({
      data: {
        organizationId: orgId,
        type: 'US_RESALE_CERT',
        number: 'X',
        jurisdiction: 'TX',
        fileKey: 'tax-docs/test/abc.pdf',
        status: 'APPROVED',
      },
    })
    const fd = new FormData()
    fd.set('taxDocumentId', doc.id)
    const { getTaxCertificateUrlAction } = await import('../_actions')
    const url = await getTaxCertificateUrlAction(fd)
    expect(url).toBe('fake://tax-docs/test/abc.pdf')
  })

  it('non-admin → Forbidden', async () => {
    const { orgId } = await makeAdminOrg()
    const doc = await prisma.taxDocument.create({
      data: {
        organizationId: orgId,
        type: 'US_RESALE_CERT',
        number: 'X',
        jurisdiction: 'TX',
        fileKey: 'tax-docs/test/xyz.pdf',
        status: 'APPROVED',
      },
    })
    const buyer = await prisma.user.create({
      data: { email: `b2-${Date.now()}@t.com`, isPlatformAdmin: false },
    })
    authUser.id = buyer.id
    authUser.email = buyer.email
    const fd = new FormData()
    fd.set('taxDocumentId', doc.id)
    const { getTaxCertificateUrlAction } = await import('../_actions')
    await expect(getTaxCertificateUrlAction(fd)).rejects.toThrow(/Forbidden/)
  })
})

// Defensa contra el linter: el helper viene del módulo.
void _setStorageClient
