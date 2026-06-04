import { prisma } from '@/lib/db/client'
import { _resetFakeStorage } from '@/lib/storage'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveOrganization,
  isVerified,
  rejectOrganization,
  uploadAndAutoApprove,
  uploadCertificate,
} from '../service'

beforeEach(async () => {
  await cleanDb()
  _resetFakeStorage()
})

async function makeOrg(opts: { status?: 'PENDING' | 'VERIFIED' | 'REJECTED' } = {}) {
  return prisma.organization.create({
    data: {
      name: 'Test',
      slug: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      verificationStatus: opts.status ?? 'PENDING',
    },
  })
}

async function makeAdmin() {
  return prisma.user.create({
    data: { email: `adm-${Date.now()}-${Math.random()}@t.com`, isPlatformAdmin: true },
  })
}

describe('uploadCertificate (no auto-approve, Onboarding B2B)', () => {
  it('deja la org PENDING + verificationSubmittedAt + TaxDocument UPLOADED', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    await uploadCertificate({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'TX-1',
      jurisdiction: 'TX',
      fileName: 'cert.pdf',
      fileBytes: new Uint8Array([1, 2, 3]),
      country: 'US',
    })
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('PENDING')
    expect(o.verificationSubmittedAt).not.toBeNull()
    expect(o.taxExempt).toBe(false)
    const doc = await prisma.taxDocument.findFirstOrThrow({ where: { organizationId: org.id } })
    expect(doc.status).toBe('UPLOADED')
    expect(doc.fileKey).toContain('tax-docs/')
    const ev = await prisma.domainEvent.findFirst({ where: { type: 'customer.verified' } })
    expect(ev).toBeNull()
  })

  it('re-upload de org REJECTED → PENDING + limpia rejectionReason', async () => {
    const org = await makeOrg({ status: 'REJECTED' })
    await prisma.organization.update({
      where: { id: org.id },
      data: { rejectionReason: 'Certificado vencido' },
    })
    await uploadCertificate({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'TX-2',
      jurisdiction: 'TX',
      fileName: 'cert2.pdf',
      fileBytes: new Uint8Array([1, 2, 3]),
    })
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('PENDING')
    expect(o.rejectionReason).toBeNull()
  })
})

describe('approveOrganization', () => {
  it('PENDING → VERIFIED + taxExempt + emite customer.verified + TaxDoc APPROVED', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    const admin = await makeAdmin()
    await uploadCertificate({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'TX-3',
      jurisdiction: 'TX',
      fileName: 'cert.pdf',
      fileBytes: new Uint8Array([1]),
    })
    await approveOrganization({ organizationId: org.id, byAdminId: admin.id })
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('VERIFIED')
    expect(o.taxExempt).toBe(true)
    expect(o.verifiedAt).not.toBeNull()
    expect(await isVerified(org.id)).toBe(true)
    const doc = await prisma.taxDocument.findFirstOrThrow({ where: { organizationId: org.id } })
    expect(doc.status).toBe('APPROVED')
    expect(doc.reviewedById).toBe(admin.id)
    const ev = await prisma.domainEvent.findFirstOrThrow({ where: { type: 'customer.verified' } })
    expect((ev.payload as { organizationId: string }).organizationId).toBe(org.id)
  })
})

describe('rejectOrganization', () => {
  it('PENDING → REJECTED + reason + emite customer.rejected + TaxDoc REJECTED', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    const admin = await makeAdmin()
    await uploadCertificate({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'TX-X',
      jurisdiction: 'TX',
      fileName: 'cert.pdf',
      fileBytes: new Uint8Array([1]),
    })
    await rejectOrganization({
      organizationId: org.id,
      byAdminId: admin.id,
      reason: 'Certificado vencido',
    })
    const o = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(o.verificationStatus).toBe('REJECTED')
    expect(o.rejectionReason).toBe('Certificado vencido')
    expect(o.taxExempt).toBe(false)
    const doc = await prisma.taxDocument.findFirstOrThrow({ where: { organizationId: org.id } })
    expect(doc.status).toBe('REJECTED')
    const ev = await prisma.domainEvent.findFirstOrThrow({ where: { type: 'customer.rejected' } })
    expect((ev.payload as { reason: string }).reason).toBe('Certificado vencido')
  })

  it('reason vacío → throw', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    const admin = await makeAdmin()
    await expect(
      rejectOrganization({ organizationId: org.id, byAdminId: admin.id, reason: '   ' })
    ).rejects.toThrow(/reason is required/i)
  })
})

describe('idempotency (fix admin doble-clic)', () => {
  it('approve twice → customer.verified emitido una sola vez', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    const admin = await makeAdmin()
    const r1 = await approveOrganization({ organizationId: org.id, byAdminId: admin.id })
    const r2 = await approveOrganization({ organizationId: org.id, byAdminId: admin.id })
    expect(r1.changed).toBe(true)
    expect(r2.changed).toBe(false)
    const events = await prisma.domainEvent.findMany({
      where: { type: 'customer.verified', aggregateId: org.id },
    })
    expect(events).toHaveLength(1)
  })

  it('reject 2x con MISMO motivo → customer.rejected una sola vez', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    const admin = await makeAdmin()
    const r1 = await rejectOrganization({
      organizationId: org.id,
      byAdminId: admin.id,
      reason: 'Certificado vencido',
    })
    const r2 = await rejectOrganization({
      organizationId: org.id,
      byAdminId: admin.id,
      reason: 'Certificado vencido',
    })
    expect(r1.changed).toBe(true)
    expect(r2.changed).toBe(false)
    const events = await prisma.domainEvent.findMany({
      where: { type: 'customer.rejected', aggregateId: org.id },
    })
    expect(events).toHaveLength(1)
  })

  it('reject 2x con motivos DISTINTOS → customer.rejected 2 veces (cambio amerita notificación)', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    const admin = await makeAdmin()
    await rejectOrganization({
      organizationId: org.id,
      byAdminId: admin.id,
      reason: 'Certificado vencido',
    })
    const r2 = await rejectOrganization({
      organizationId: org.id,
      byAdminId: admin.id,
      reason: 'Documento ilegible',
    })
    expect(r2.changed).toBe(true)
    const events = await prisma.domainEvent.findMany({
      where: { type: 'customer.rejected', aggregateId: org.id },
    })
    expect(events).toHaveLength(2)
    const updated = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(updated.rejectionReason).toBe('Documento ilegible')
  })
})

describe('uploadAndAutoApprove (compat admin-direct upload)', () => {
  it('compone uploadCertificate + approveOrganization → VERIFIED + customer.verified', async () => {
    const org = await makeOrg({ status: 'PENDING' })
    await uploadAndAutoApprove({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'CERT-001',
      jurisdiction: 'FL',
      fileName: 'cert.pdf',
      fileBytes: new TextEncoder().encode('fake-pdf'),
      country: 'US',
    })
    const updated = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })
    expect(updated.verificationStatus).toBe('VERIFIED')
    expect(updated.taxExempt).toBe(true)
    expect(updated.country).toBe('US')
    const ev = await prisma.domainEvent.findFirst({
      where: { type: 'customer.verified', aggregateId: org.id },
    })
    expect(ev).not.toBeNull()
  })
})
