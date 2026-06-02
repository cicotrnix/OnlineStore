import { prisma } from '@/lib/db/client'
import { redirect } from 'next/navigation'
import { auth } from './config'

export type CustomerState =
  | { kind: 'anonymous' }
  | { kind: 'no-org'; userId: string }
  | { kind: 'pending'; userId: string; orgId: string; rejectionReason?: string }
  | { kind: 'rejected'; userId: string; orgId: string; rejectionReason: string }
  | {
      kind: 'verified'
      userId: string
      orgId: string
      orgName: string
      isImpersonating: boolean
    }

/**
 * Resuelve el estado del comprador actual para gating B2B (Onboarding 2026-06-02).
 * - anonymous → no logueado.
 * - no-org → logueado, sin pertenencia a ninguna org.
 * - pending / rejected → org activa según verificationStatus.
 * - verified → puede ver precios + comprar.
 *
 * Si hay impersonation activa, la org efectiva es la impersonada (admin viendo
 * como buyer); pero solo si la org impersonada está VERIFIED.
 */
export async function getCustomerState(): Promise<CustomerState> {
  const session = await auth()
  if (!session?.user?.id) return { kind: 'anonymous' }
  const userId = session.user.id
  const orgId = session.impersonatingOrgId ?? session.activeOrgId
  if (!orgId) {
    // Si tiene memberships, usar la primera (auto-pick); si no, no-org.
    const member = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    })
    if (!member) return { kind: 'no-org', userId }
    return resolveByOrgId({ userId, orgId: member.organizationId, isImpersonating: false })
  }
  return resolveByOrgId({ userId, orgId, isImpersonating: !!session.impersonatingOrgId })
}

async function resolveByOrgId(args: {
  userId: string
  orgId: string
  isImpersonating: boolean
}): Promise<CustomerState> {
  const org = await prisma.organization.findUnique({
    where: { id: args.orgId },
    select: {
      id: true,
      name: true,
      verificationStatus: true,
      rejectionReason: true,
    },
  })
  if (!org) return { kind: 'no-org', userId: args.userId }
  if (org.verificationStatus === 'VERIFIED') {
    return {
      kind: 'verified',
      userId: args.userId,
      orgId: org.id,
      orgName: org.name,
      isImpersonating: args.isImpersonating,
    }
  }
  if (org.verificationStatus === 'REJECTED') {
    return {
      kind: 'rejected',
      userId: args.userId,
      orgId: org.id,
      rejectionReason: org.rejectionReason ?? 'Sin motivo especificado',
    }
  }
  return {
    kind: 'pending',
    userId: args.userId,
    orgId: org.id,
    rejectionReason: org.rejectionReason ?? undefined,
  }
}

/**
 * Guard RSC: redirige según estado. Usado por layouts de rutas gated (carrito,
 * checkout, órdenes, facturas, etc.).
 *
 * - anonymous → /sign-in
 * - no-org → /onboarding
 * - pending → /onboarding/pending
 * - rejected → /onboarding/pending (con motivo)
 * - verified → devuelve el state
 */
export async function requireVerifiedCustomer(): Promise<
  Extract<CustomerState, { kind: 'verified' }>
> {
  const state = await getCustomerState()
  if (state.kind === 'anonymous') redirect('/sign-in')
  if (state.kind === 'no-org') redirect('/onboarding')
  if (state.kind === 'pending' || state.kind === 'rejected') redirect('/onboarding/pending')
  return state
}
