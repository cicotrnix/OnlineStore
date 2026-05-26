import { catalogRouter } from './routers/catalog'
import { ordersRouter } from './routers/orders'
import { pricingRouter } from './routers/pricing'
import { router } from './server'

export const appRouter = router({
  catalog: catalogRouter,
  pricing: pricingRouter,
  orders: ordersRouter,
})

export type AppRouter = typeof appRouter
