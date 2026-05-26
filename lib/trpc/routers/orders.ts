import { ordersService } from '@/modules/orders'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure, effectiveOrgId, protectedProcedure, router } from '../server'

export const ordersRouter = router({
  listForActiveOrg: protectedProcedure.query(({ ctx }) => {
    const orgId = effectiveOrgId(ctx)
    if (!orgId) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No active org' })
    return ordersService.listForOrg(orgId)
  }),

  listAll: adminProcedure.query(() => ordersService.listAll()),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(({ input }) => ordersService.findById(input.id)),

  transitionStatus: adminProcedure
    .input(
      z.object({
        orderId: z.string().cuid(),
        newStatus: z.enum(['CONFIRMED', 'SHIPPED', 'DELIVERED']),
      })
    )
    .mutation(({ input }) => ordersService.transitionStatus(input)),

  cancel: adminProcedure
    .input(z.object({ orderId: z.string().cuid() }))
    .mutation(({ ctx, input }) =>
      ordersService.cancel({ orderId: input.orderId, byUserId: ctx.user.id })
    ),
})
