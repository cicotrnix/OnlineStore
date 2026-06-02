'use server'

import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { createCardCheckout } from '@/modules/payments'
import storeConfig from '@/store.config'
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
  if (!storeConfig.payments.stripe.enabled) {
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
