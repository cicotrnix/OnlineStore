import { prisma } from '@/lib/db/client'
import { cleanDb } from '@/tests/helpers/cleanDb'
import { beforeEach, describe, expect, it } from 'vitest'
import { customersService } from '../service'

beforeEach(async () => {
  await cleanDb()
})

describe('createOrganizationWithOwner', () => {
  it('crea org PENDING + OWNER member + default address en tx', async () => {
    const user = await prisma.user.create({ data: { email: `ob-${Date.now()}@t.com` } })
    const org = await customersService.createOrganizationWithOwner({
      userId: user.id,
      name: 'Acme Repair Shop',
      country: 'US',
      address: {
        recipient: 'Acme Repair Shop',
        line1: '123 Main St',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
      },
    })
    expect(org.name).toBe('Acme Repair Shop')
    expect(org.slug).toMatch(/^acme-repair-shop-[a-f0-9]{6}$/)
    expect(org.verificationStatus).toBe('PENDING')
    expect(org.country).toBe('US')
    expect(org.addresses).toHaveLength(1)
    expect(org.addresses[0]?.isDefaultBilling).toBe(true)
    expect(org.addresses[0]?.isDefaultShipping).toBe(true)
    const member = await prisma.organizationMember.findFirstOrThrow({
      where: { organizationId: org.id },
    })
    expect(member.userId).toBe(user.id)
    expect(member.role).toBe('OWNER')
  })

  it('slug es único aún con name idéntico (random suffix)', async () => {
    const u1 = await prisma.user.create({ data: { email: `u1-${Date.now()}@t.com` } })
    const u2 = await prisma.user.create({ data: { email: `u2-${Date.now()}@t.com` } })
    const addr = {
      recipient: 'X',
      line1: '1',
      city: 'X',
      postalCode: '0',
    }
    const a = await customersService.createOrganizationWithOwner({
      userId: u1.id,
      name: 'Same Name',
      country: 'US',
      address: addr,
    })
    const b = await customersService.createOrganizationWithOwner({
      userId: u2.id,
      name: 'Same Name',
      country: 'US',
      address: addr,
    })
    expect(a.slug).not.toBe(b.slug)
  })
})
