import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { requireAuth } from '@/lib/auth/helpers'
import { getLocale, t } from '@/lib/i18n'
import { ordersService } from '@/modules/orders'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/**
 * URL de éxito de Stripe Checkout. PSDD: NO confirmamos pago acá. El cliente
 * llega con success_url tras pagar; el estado real lo escribe el webhook
 * firmado. Mensaje: "procesando" hasta que el webhook flippea el order.status.
 */
export default async function PaymentPendingPage({ params }: Props) {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const { id } = await params
  const order = await ordersService.findById(id)
  if (!order) notFound()

  const confirmed =
    order.status === 'CONFIRMED' || order.status === 'SHIPPED' || order.status === 'DELIVERED'

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-card border border-line p-6">
        <h1 className="text-xl font-semibold text-ink-950">
          {confirmed
            ? t(locale, 'account.orders.pp.confirmedTitle')
            : t(locale, 'account.orders.pp.processingTitle')}
        </h1>
        <p className="mt-1 text-xs text-ink-500">
          {t(locale, 'account.orders.orderLabel')}{' '}
          <span className="font-mono">{order.orderNumber}</span> ·{' '}
          <OrderStatusBadge status={order.status} />
        </p>
        <div className="mt-4 space-y-3 text-sm text-ink-700">
          {confirmed ? (
            <p>{t(locale, 'account.orders.pp.confirmedBody')}</p>
          ) : (
            <>
              <p>{t(locale, 'account.orders.pp.processingBody1')}</p>
              <p>{t(locale, 'account.orders.pp.processingBody2')}</p>
            </>
          )}
          <Link
            href={`/orders/${order.id}`}
            className="inline-block font-medium text-lime-deep hover:underline"
          >
            {t(locale, 'account.orders.pp.backToOrder')}
          </Link>
        </div>
      </div>
    </div>
  )
}
