import { prisma } from '@/lib/db/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { customersService } from './service'

const runIntegration = process.env.RUN_INTEGRATION === '1'

async function createTestUser(email: string) {
  return prisma.user.create({ data: { email } })
}

describe.skipIf(!runIntegration)('customersService (integration)', () => {
  beforeEach(async () => {
    await prisma.invitation.deleteMany()
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()
  })

  it('creates organization with owner', async () => {
    const user = await createTestUser('owner@example.com')
    const org = await customersService.createOrganization({
      name: 'Acme',
      slug: 'acme',
      ownerUserId: user.id,
    })
    expect(org.slug).toBe('acme')

    const memberships = await prisma.organizationMember.findMany({
      where: { organizationId: org.id },
    })
    expect(memberships).toHaveLength(1)
    expect(memberships[0]?.role).toBe('OWNER')
  })

  it('invites a member with a unique token', async () => {
    const user = await createTestUser('owner@example.com')
    const org = await customersService.createOrganization({
      name: 'Acme',
      slug: 'acme',
      ownerUserId: user.id,
    })
    const invite = await customersService.inviteMember({
      organizationId: org.id,
      email: 'invitee@example.com',
    })
    expect(invite.token).toMatch(/^[A-Za-z0-9_-]{20,}$/)
    expect(invite.role).toBe('BUYER')
  })

  it('accepts a valid invitation', async () => {
    const owner = await createTestUser('owner@example.com')
    const invitee = await createTestUser('invitee@example.com')
    const org = await customersService.createOrganization({
      name: 'Acme',
      slug: 'acme',
      ownerUserId: owner.id,
    })
    const invite = await customersService.inviteMember({
      organizationId: org.id,
      email: 'invitee@example.com',
    })

    await customersService.acceptInvitation({ token: invite.token, userId: invitee.id })

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, userId: invitee.id },
    })
    expect(membership?.role).toBe('BUYER')
  })

  it('rejects expired invitations', async () => {
    const owner = await createTestUser('owner@example.com')
    const invitee = await createTestUser('invitee@example.com')
    const org = await customersService.createOrganization({
      name: 'Acme',
      slug: 'acme',
      ownerUserId: owner.id,
    })
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: org.id,
        email: 'invitee@example.com',
        role: 'BUYER',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000),
      },
    })

    await expect(
      customersService.acceptInvitation({ token: invitation.token, userId: invitee.id })
    ).rejects.toThrow(/expired/i)
  })
})
