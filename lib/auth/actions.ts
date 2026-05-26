'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { auth } from './config'

async function getSessionToken(): Promise<string | null> {
  const c = await cookies()
  return (
    c.get('authjs.session-token')?.value ?? c.get('__Secure-authjs.session-token')?.value ?? null
  )
}

export async function switchActiveOrg(orgId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Not authenticated')

  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  })
  if (!member) throw new Error('Not a member of this organization')

  const token = await getSessionToken()
  if (!token) throw new Error('No session token')

  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } })
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }

  await prisma.session.update({
    where: { sessionToken: token },
    data: { activeOrgId: orgId },
  })

  revalidatePath('/', 'layout')
}

export async function impersonationStart(targetOrgId: string, reason?: string) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    throw new Error('Only platform admins can impersonate')
  }

  const token = await getSessionToken()
  if (!token) throw new Error('No session token')

  await prisma.$transaction([
    prisma.session.update({
      where: { sessionToken: token },
      data: { impersonatingOrgId: targetOrgId, lastSeenAt: new Date() },
    }),
    prisma.impersonationLog.create({
      data: {
        adminUserId: session.user.id,
        targetOrgId,
        action: 'START',
        reason: reason ?? null,
      },
    }),
  ])

  revalidatePath('/', 'layout')
}

export async function impersonationStop() {
  const session = await auth()
  if (!session?.user) throw new Error('Not authenticated')

  const token = await getSessionToken()
  if (!token) throw new Error('No session token')

  const sess = await prisma.session.findUnique({ where: { sessionToken: token } })
  if (!sess?.impersonatingOrgId) return

  await prisma.$transaction([
    prisma.session.update({
      where: { sessionToken: token },
      data: { impersonatingOrgId: null },
    }),
    prisma.impersonationLog.create({
      data: {
        adminUserId: session.user.id,
        targetOrgId: sess.impersonatingOrgId,
        action: 'STOP',
      },
    }),
  ])

  revalidatePath('/', 'layout')
}
