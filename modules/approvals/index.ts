import { prisma } from '@/lib/db/client'

export { decide, request } from './service'
export { subscribe } from './registry'
export type { DecideInput, RequestInput } from './service'

export async function canApprove(userId: string, orgId: string): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
    select: { role: true },
  })
  if (!member) return false
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { approvalRoles: true },
  })
  return (org.approvalRoles as string[]).includes(member.role)
}
