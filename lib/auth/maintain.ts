import { prisma } from '@/lib/db/client'
import { cookies } from 'next/headers'
import { auth } from './config'

const IMPERSONATION_TIMEOUT_MS = 30 * 60 * 1000

/**
 * Side-effect: refresca Session.lastSeenAt y auto-expira impersonation > 30min.
 * Llamar desde RSC layouts (Node runtime). NO usar en middleware edge —
 * Prisma falla en wasm-engine-edge con strategy=database.
 */
export async function maintainCurrentSession(): Promise<void> {
  const session = await auth()
  if (!session?.user) return

  const cookieStore = await cookies()
  const sessionToken =
    cookieStore.get('authjs.session-token')?.value ??
    cookieStore.get('__Secure-authjs.session-token')?.value
  if (!sessionToken) return

  const sess = await prisma.session.findUnique({
    where: { sessionToken },
    select: { id: true, impersonatingOrgId: true, lastSeenAt: true },
  })
  if (!sess) return

  const now = new Date()

  if (
    sess.impersonatingOrgId &&
    now.getTime() - sess.lastSeenAt.getTime() > IMPERSONATION_TIMEOUT_MS
  ) {
    const targetOrgId = sess.impersonatingOrgId
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sess.id },
        data: { impersonatingOrgId: null, lastSeenAt: now },
      }),
      prisma.impersonationLog.create({
        data: {
          adminUserId: session.user.id,
          targetOrgId,
          action: 'STOP',
          reason: 'auto-expired',
        },
      }),
    ])
  } else {
    await prisma.session.update({
      where: { id: sess.id },
      data: { lastSeenAt: now },
    })
  }
}
