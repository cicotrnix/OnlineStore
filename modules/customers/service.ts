import { randomBytes } from 'node:crypto'
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
