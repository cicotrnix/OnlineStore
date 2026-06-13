import { logger } from '@/lib/observability/logger'
import { ordersService } from '@/modules/orders'

/**
 * OPS-1 (ADR 0036): cancela órdenes PENDING_PAYMENT cuya ventana de pago
 * (paymentDueAt) venció, restaurando el stock reservado en placeOrder.
 * Cron sugerido: diario. El admin pospone órdenes concretas vía extendPaymentDue.
 */
async function main() {
  const result = await ordersService.cancelStalePendingOrders()
  logger.info({ result }, 'cancel-stale-pending-orders run')
}

main().catch((err) => {
  logger.error({ err }, 'cancel-stale-pending-orders failed')
  process.exit(1)
})
