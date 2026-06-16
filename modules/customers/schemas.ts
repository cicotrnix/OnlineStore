import { z } from 'zod'

export const orgRoleSchema = z.enum(['OWNER', 'ADMIN', 'BUYER', 'VIEWER'])

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .min(2)
    .max(50),
})

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: orgRoleSchema.default('BUYER'),
})

export const createAddressSchema = z.object({
  organizationId: z.string().cuid(),
  label: z.string().min(1).max(80),
  recipient: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(30).optional().nullable(),
  isDefaultBilling: z.boolean().default(false),
  isDefaultShipping: z.boolean().default(false),
})

export const updateAddressSchema = z.object({
  id: z.string().cuid(),
  label: z.string().min(1).max(80),
  recipient: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().max(30).optional().nullable(),
})

export type OrgRole = z.infer<typeof orgRoleSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type CreateAddressInput = z.input<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
