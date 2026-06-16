import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db/client'
import { customersRepository } from './repository'
import {
  type CreateAddressInput,
  type OrgRole,
  createAddressSchema,
  createOrganizationSchema,
  inviteMemberSchema,
} from './schemas'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const customersService = {
  async createOrganization(input: { name: string; slug: string; ownerUserId: string }) {
    const parsed = createOrganizationSchema.parse({ name: input.name, slug: input.slug })
    return customersRepository.createOrganization({
      name: parsed.name,
      slug: parsed.slug,
      ownerUserId: input.ownerUserId,
    })
  },

  /**
   * Onboarding B2B: crea org PENDING + OWNER + dirección default-billing/shipping
   * en una tx. Slug se autogenera del name (lowercased + dasherized + random
   * suffix para evitar colisión).
   */
  async createOrganizationWithOwner(input: {
    userId: string
    name: string
    country: string
    address: {
      recipient: string
      line1: string
      line2?: string
      city: string
      state?: string
      postalCode: string
    }
  }) {
    const baseSlug = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32)
    const slug = `${baseSlug || 'org'}-${randomBytes(3).toString('hex')}`
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name.trim(),
          slug,
          country: input.country,
          verificationStatus: 'PENDING',
          members: {
            create: { userId: input.userId, role: 'OWNER' },
          },
          addresses: {
            create: {
              label: 'Default',
              recipient: input.address.recipient,
              line1: input.address.line1,
              line2: input.address.line2,
              city: input.address.city,
              state: input.address.state,
              postalCode: input.address.postalCode,
              country: input.country,
              isDefaultBilling: true,
              isDefaultShipping: true,
            },
          },
        },
        include: { addresses: true },
      })
      return org
    })
  },

  async inviteMember(input: { organizationId: string; email: string; role?: OrgRole }) {
    const parsed = inviteMemberSchema.parse({ email: input.email, role: input.role })
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
    return customersRepository.createInvitation({
      organizationId: input.organizationId,
      email: parsed.email,
      role: parsed.role,
      token,
      expiresAt,
    })
  },

  async acceptInvitation(input: { token: string; userId: string }) {
    const invitation = await customersRepository.findInvitationByToken(input.token)
    if (!invitation) throw new Error('Invitation not found')
    if (invitation.acceptedAt) throw new Error('Invitation already accepted')
    if (invitation.expiresAt < new Date()) throw new Error('Invitation expired')
    return customersRepository.acceptInvitation({
      invitationId: invitation.id,
      userId: input.userId,
    })
  },

  async listForUser(userId: string) {
    return customersRepository.findOrganizationsForUser(userId)
  },

  /** Rol del usuario en la org activa (null si no es miembro). Gating de UI. */
  async getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const membership = await customersRepository.findMembership(orgId, userId)
    return membership?.role ?? null
  },

  async createAddress(input: CreateAddressInput) {
    const parsed = createAddressSchema.parse(input)
    return customersRepository.createAddress(parsed)
  },

  async listAddresses(orgId: string) {
    return customersRepository.listAddresses(orgId)
  },

  async findAddressById(id: string) {
    return customersRepository.findAddressById(id)
  },

  async findDefaultBilling(orgId: string) {
    return customersRepository.findDefaultBilling(orgId)
  },

  async findDefaultShipping(orgId: string) {
    return customersRepository.findDefaultShipping(orgId)
  },
}
