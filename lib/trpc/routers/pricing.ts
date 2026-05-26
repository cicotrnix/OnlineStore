import { pricingService, setCustomerPriceSchema } from '@/modules/pricing'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure, effectiveOrgId, protectedProcedure, router } from '../server'

export const pricingRouter = router({
  resolveForActiveOrg: protectedProcedure
    .input(z.object({ productId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = effectiveOrgId(ctx)
      if (!orgId) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No active org' })
      const price = await pricingService.resolveForOrg(orgId, input.productId)
      return price.toString()
    }),

  setCustomerPrice: adminProcedure
    .input(setCustomerPriceSchema)
    .mutation(({ input }) => pricingService.setCustomerPrice(input)),

  listForOrg: adminProcedure
    .input(z.object({ orgId: z.string().cuid() }))
    .query(({ input }) => pricingService.listForOrg(input.orgId)),
})
