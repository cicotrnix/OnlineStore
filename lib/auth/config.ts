import { prisma } from '@/lib/db/client'
import { getStoreConfig } from '@/stores'
import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'

const storeConfig = getStoreConfig()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      name: `Sign in to ${storeConfig.identity.name}`,
    }),
  ],
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/sign-in?check=email',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isPlatformAdmin: true },
        })
        session.user.isPlatformAdmin = dbUser?.isPlatformAdmin ?? false

        const sess = await prisma.session.findFirst({
          where: { userId: user.id },
          orderBy: { expires: 'desc' },
          select: { activeOrgId: true, impersonatingOrgId: true },
        })
        session.activeOrgId = sess?.activeOrgId ?? null
        session.impersonatingOrgId = sess?.impersonatingOrgId ?? null
      }
      return session
    },
  },
})
