import { auth } from '@/lib/auth/config'
import { TRPCError, initTRPC } from '@trpc/server'
import superjson from 'superjson'

export async function createContext() {
  const session = await auth()
  return { session }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({ transformer: superjson })

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, session: ctx.session, user: ctx.session.user } })
})

export const adminProcedure = protectedProcedure.use((opts) => {
  if (!opts.ctx.user.isPlatformAdmin) throw new TRPCError({ code: 'FORBIDDEN' })
  return opts.next()
})

export function effectiveOrgId(ctx: Context): string | null {
  if (!ctx.session) return null
  return ctx.session.impersonatingOrgId ?? ctx.session.activeOrgId
}
