import { prisma } from '@/lib/db/client'
import { redirect } from 'next/navigation'
import { auth } from './config'

/**
 * Resuelve la org activa efectiva en este orden:
 *   1) impersonatingOrgId (admin actuando como buyer)
 *   2) activeOrgId (set por switchActiveOrg / select-org / onboarding)
 *   3) si el usuario tiene exactamente una membresía → esa (auto-pick)
 *
 * Devuelve null si no hay sesión, si tiene 0 membresías, o si tiene
 * múltiples membresías sin elegir. El caller decide qué hacer con null
 * (redirect, notFound, error). Evita el patrón anterior de `notFound`
 * directo cuando lo correcto es auto-pickear la única org del usuario.
 */
export async function resolveActiveOrgId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const explicit = session.impersonatingOrgId ?? session.activeOrgId
  if (explicit) return explicit
  const members = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
    take: 2,
  })
  if (members.length === 1 && members[0]) return members[0].organizationId
  return null
}

/**
 * Igual que resolveActiveOrgId, pero redirige a /select-org si no se
 * puede resolver. Para páginas RSC que requieren una org activa
 * (orders, invoices, quotes, approvals).
 */
export async function requireActiveOrgId(): Promise<string> {
  const orgId = await resolveActiveOrgId()
  if (!orgId) redirect('/select-org')
  return orgId
}
