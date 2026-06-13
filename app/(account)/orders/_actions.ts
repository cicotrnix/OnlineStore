'use server'

import { resolveActiveOrgId } from '@/lib/auth/active-org'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/observability/logger'
import { createCardCheckout } from '@/modules/payments'
import { OrderNotFoundError, type ReorderResult, reorderService } from '@/modules/reorder'
import { getStoreConfig } from '@/stores'
import { redirect } from 'next/navigation'

/**
 * Inicia checkout con tarjeta (Stripe Checkout hosted). Server action — el
 * caller invoca y obtiene un redirect 303 a session.url. PSDD: jamás
 * confirmamos pago acá; solo la sesión.
 *
 * Gate por feature flag `payments.stripe.enabled` en store.config (inerte
 * hasta que ops lo encienda + STRIPE_SECRET_KEY exista en env).
 */
export async function startCardCheckoutAction(formData: FormData): Promise<void> {
  if (!getStoreConfig().payments.stripe.enabled) {
    throw new Error('PAYMENT_CARD_DISABLED')
  }
  const user = await requireAuth()
  const orderId = String(formData.get('orderId'))
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      placedByUserId: true,
      organizationId: true,
    },
  })
  if (!order) throw new Error('order not found')
  if (order.placedByUserId !== user.id) throw new Error('FORBIDDEN')
  if (order.status !== 'PENDING_PAYMENT') throw new Error('ORDER_NOT_PAYABLE')

  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const { url } = await createCardCheckout({
    orderId: order.id,
    customerEmail: user.email ?? undefined,
    successUrl: `${base}/orders/${order.id}/payment-pending`,
    cancelUrl: `${base}/orders/${order.id}`,
  })
  redirect(url)
}

/** Estado que la action de re-orden devuelve al cliente (no redirige el server). */
export type ReorderActionState =
  | { ok: true; result: ReorderResult }
  | { ok: false; messageKey: string }

function reorderErrorKey(err: unknown): string {
  if (err instanceof OrderNotFoundError) return 'reorder.toast.notFound'
  if (err instanceof Error && err.message === 'ORG_NOT_VERIFIED') return 'reorder.toast.notVerified'
  return 'reorder.toast.failed'
}

/**
 * "Volver a pedir": agrega las líneas viables del pedido al carrito y DEVUELVE
 * el resultado (added/skipped) al cliente, que decide navegar a /cart o avisar.
 * Action fina — la lógica vive en modules/reorder. Errores tipados → message
 * keys con logger.error (patrón CAL-1).
 */
export async function reorderAction(orderId: string): Promise<ReorderActionState> {
  const user = await requireAuth()
  const orgId = await resolveActiveOrgId()
  if (!orgId) return { ok: false, messageKey: 'reorder.toast.failed' }
  try {
    const result = await reorderService.reorderToCart({ orderId, userId: user.id, orgId })
    return { ok: true, result }
  } catch (err) {
    logger.error({ err, userId: user.id, orgId, orderId, action: 'reorder' }, 'reorder failed')
    return { ok: false, messageKey: reorderErrorKey(err) }
  }
}
