import { prisma } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'
import type { OrgRole } from './schemas'

export const customersRepository = {
  async createOrganization(input: { name: string; slug: string; ownerUserId: string }) {
    return prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: {
          create: { userId: input.ownerUserId, role: 'OWNER' },
        },
      },
    })
  },

  async findOrganizationsForUser(userId: string) {
    return prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { members: { where: { userId }, select: { role: true } } },
    })
  },

  async createInvitation(input: {
    organizationId: string
    email: string
    role: OrgRole
    token: string
    expiresAt: Date
  }) {
    return prisma.invitation.create({ data: input })
  },

  async findInvitationByToken(token: string) {
    return prisma.invitation.findUnique({ where: { token } })
  },

  async acceptInvitation(input: { invitationId: string; userId: string }) {
    return prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.update({
        where: { id: input.invitationId },
        data: { acceptedAt: new Date() },
      })
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: input.userId,
          role: invitation.role,
        },
      })
      return invitation
    })
  },

  async createAddress(data: Prisma.OrganizationAddressUncheckedCreateInput) {
    return prisma.organizationAddress.create({ data })
  },

  async listAddresses(orgId: string) {
    return prisma.organizationAddress.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    })
  },

  async findAddressById(id: string) {
    return prisma.organizationAddress.findUnique({ where: { id } })
  },

  async findDefaultBilling(orgId: string) {
    return prisma.organizationAddress.findFirst({
      where: { organizationId: orgId, isDefaultBilling: true },
    })
  },

  async findDefaultShipping(orgId: string) {
    return prisma.organizationAddress.findFirst({
      where: { organizationId: orgId, isDefaultShipping: true },
    })
  },
}
