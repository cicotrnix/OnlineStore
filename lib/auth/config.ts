import { prisma } from '@/lib/db/client'
import storeConfig from '@/store.config'
import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'

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
      }
      return session
    },
  },
})
