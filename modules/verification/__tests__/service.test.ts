import { prisma } from '@/lib/db/client'
import { _resetFakeStorage } from '@/lib/storage'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { isVerified, uploadAndAutoApprove } from '../service'

beforeEach(async () => {
  await cleanDb()
  _resetFakeStorage()
})

async function makeOrg() {
  return prisma.organization.create({
    data: { name: 'Test', slug: `t-${Date.now()}-${Math.random()}` },
  })
}

describe('verification.uploadAndAutoApprove', () => {
  it('auto-aprueba, marca taxExempt y emite customer.verified', async () => {
    const org = await makeOrg()
    await uploadAndAutoApprove({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'CERT-001',
      jurisdiction: 'FL',
      fileName: 'cert.pdf',
      fileBytes: new TextEncoder().encode('fake-pdf'),
      country: 'US',
    })
    const updated = await prisma.organization.findUnique({ where: { id: org.id } })
    expect(updated?.verificationStatus).toBe('VERIFIED')
    expect(updated?.taxExempt).toBe(true)
    expect(updated?.country).toBe('US')
    const doc = await prisma.taxDocument.findFirst({ where: { organizationId: org.id } })
    expect(doc?.status).toBe('APPROVED')
    expect(doc?.fileKey).toContain('tax-docs/')
    const ev = await prisma.domainEvent.findFirst({
      where: { type: 'customer.verified', aggregateId: org.id },
    })
    expect(ev).not.toBeNull()
  })

  it('isVerified true tras la carga, false antes', async () => {
    const org = await makeOrg()
    expect(await isVerified(org.id)).toBe(false)
    await uploadAndAutoApprove({
      organizationId: org.id,
      type: 'US_RESALE_CERT',
      number: 'X',
      jurisdiction: 'NY',
      fileName: 'x.pdf',
      fileBytes: new TextEncoder().encode('x'),
    })
    expect(await isVerified(org.id)).toBe(true)
  })
})
