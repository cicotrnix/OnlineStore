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

export type OrgRole = z.infer<typeof orgRoleSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
