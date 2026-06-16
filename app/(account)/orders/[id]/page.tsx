import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { PaymentBadge } from '@/components/commerce/PaymentBadge'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { prisma } from '@/lib/db/client'
import { type Locale, getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import { getStoreConfig } from '@/stores'
import { notFound } from 'next/navigation'
import { ReorderButton } from '../ReorderButton'
import { startCardCheckoutAction } from '../_actions'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

type OrderAddress = {
  label: string
  recipient: string
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
}

function AddressBlock({
  locale,
  titleKey,
  address,
}: {
  locale: Locale
  titleKey: 'account.orders.billing' | 'account.orders.shipping'
  address: OrderAddress
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {t(locale, titleKey)}
      </div>
      <div className="mt-1 text-sm text-ink-500">
        <strong className="text-ink-950">{address.label}</strong>
        <div>{address.recipient}</div>
        <div>{address.line1}</div>
        {address.line2 && <div>{address.line2}</div>}
        <div>
          {address.city}
          {address.state ? `, ${address.state}` : ''} {address.postalCode}
        </div>
        <div className="font-mono text-xs uppercase">{address.country}</div>
      </div>
    </div>
  )
}

export default async function OrderDetailPage({ params }: Props) {
  const customer = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: customer.userId })
  const { id } = await params
  const order = await ordersService.findById(id)
  if (!order) notFound()

  const payment = await prisma.payment.findUnique({
    where: { orderId: order.id },
    select: { status: true },
  })
  const canPayWithCard =
    getStoreConfig().payments.stripe.enabled && order.status === 'PENDING_PAYMENT'

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
            {t(locale, 'account.orders.orderLabel')}{' '}
            <span className="font-mono">{order.orderNumber}</span>
          </h1>
          <p className="mt-1 text-xs text-ink-500">
            {order.organization.name} ·{' '}
            {t(locale, 'account.orders.placedBy', {
              email: order.placedBy.email,
            })}{' '}
            · {order.placedAt.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentBadge
            paymentStatus={payment?.status === 'CAPTURED' ? 'CAPTURED' : payment ? 'PENDING' : null}
            locale={locale}
          />
        </div>
      </div>

      <div className="mt-6">
        <ReorderButton orderId={order.id} locale={locale} variant="primary" />
      </div>

      {/* Líneas — readout instrument */}
      <div className="mt-8 overflow-hidden rounded-card border border-line">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">
                {t(locale, 'account.orders.col.sku')}
              </th>
              <th className="px-5 py-2 text-left font-medium">
                {t(locale, 'account.orders.col.product')}
              </th>
              <th className="px-5 py-2 text-right font-medium">
                {t(locale, 'account.orders.col.price')}
              </th>
              <th className="px-5 py-2 text-right font-medium">
                {t(locale, 'account.orders.col.qty')}
              </th>
              <th className="px-5 py-2 text-right font-medium">
                {t(locale, 'account.orders.col.total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-t border-line">
                <td className="px-5 py-2 font-mono text-xs text-ink-500">{line.sku}</td>
                <td className="px-5 py-2 text-ink-950">{line.name}</td>
                <td className="px-5 py-2 text-right font-mono tabular-nums text-ink-500">
                  {formatMoney(line.unitPrice, order.currency)}
                </td>
                <td className="px-5 py-2 text-right font-mono tabular-nums text-ink-950">
                  {line.quantity}
                </td>
                <td className="px-5 py-2 text-right font-mono font-medium tabular-nums text-ink-950">
                  {formatMoney(line.lineTotal, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Direcciones */}
      <div className="mt-6 rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'account.orders.addresses')}
        </h2>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          <AddressBlock
            locale={locale}
            titleKey="account.orders.billing"
            address={order.billingAddress}
          />
          <AddressBlock
            locale={locale}
            titleKey="account.orders.shipping"
            address={order.shippingAddress}
          />
        </div>
      </div>

      {/* Totales */}
      <div className="mt-6 rounded-card border border-line p-5">
        <dl className="space-y-2 text-sm">
          {order.poNumber && (
            <div className="flex justify-between">
              <dt className="text-ink-500">PO</dt>
              <dd className="font-mono text-ink-950">{order.poNumber}</dd>
            </div>
          )}
          {order.notes && (
            <div>
              <dt className="text-ink-500">{t(locale, 'account.orders.notes')}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink-950">{order.notes}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="text-ink-500">{t(locale, 'account.orders.subtotal')}</dt>
            <dd className="font-mono tabular-nums text-ink-950">
              {formatMoney(order.subtotal, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt className="text-ink-950">{t(locale, 'account.orders.total')}</dt>
            <dd className="font-mono tabular-nums text-ink-950">
              {formatMoney(order.total, order.currency)}
            </dd>
          </div>
        </dl>
      </div>

      {canPayWithCard && (
        <div className="mt-6 rounded-card border border-line p-5">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'account.orders.payCard')}
          </h2>
          <p className="mt-1 text-xs text-ink-500">{t(locale, 'account.orders.payCardHint')}</p>
          <form action={startCardCheckoutAction} className="mt-3">
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="rounded-button bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent/90"
            >
              {t(locale, 'account.orders.payCta', {
                amount: formatMoney(order.total, order.currency),
              })}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
