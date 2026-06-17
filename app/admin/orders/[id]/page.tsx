import {
  cancelOrderAction,
  extendPaymentDueAction,
  transitionOrderStatusAction,
} from '@/app/admin/_actions'
import { AdminPageHeader, type Column, DataTable, StatusBadge } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { type MessageKey, getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

const TRANSITIONS: Record<string, Array<'CONFIRMED' | 'SHIPPED' | 'DELIVERED'>> = {
  PENDING_PAYMENT: ['CONFIRMED'],
  CONFIRMED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

const CAN_CANCEL = new Set(['PENDING_PAYMENT', 'CONFIRMED'])

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const order = await ordersService.findById(id)
  if (!order) notFound()

  const nextStatuses = TRANSITIONS[order.status] ?? []
  const payment = await prisma.payment.findUnique({
    where: { orderId: order.id },
    select: { id: true, status: true, method: true, wireReference: true },
  })

  type Line = (typeof order.lines)[number]
  const lineColumns: Column<Line>[] = [
    {
      key: 'sku',
      header: t(locale, 'admin.col.sku'),
      className: 'font-mono text-xs text-ink-500',
      cell: (l) => l.sku,
    },
    { key: 'name', header: t(locale, 'admin.col.product'), cell: (l) => l.name },
    {
      key: 'price',
      header: t(locale, 'admin.col.price'),
      align: 'right',
      className: 'font-mono tabular-nums text-ink-500',
      cell: (l) => formatMoney(l.unitPrice, order.currency),
    },
    {
      key: 'qty',
      header: t(locale, 'admin.col.qty'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (l) => l.quantity,
    },
    {
      key: 'total',
      header: t(locale, 'admin.col.total'),
      align: 'right',
      className: 'font-mono font-medium tabular-nums',
      cell: (l) => formatMoney(l.lineTotal, order.currency),
    },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title={<span className="font-mono">{order.orderNumber}</span>}
          subtitle={`${order.organization.name} · ${order.placedBy.email} · ${order.placedAt.toLocaleString()}`}
        />
        <StatusBadge domain="order" status={order.status} locale={locale} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-950">
          {t(locale, 'admin.orders.lines')}
        </h2>
        <DataTable columns={lineColumns} rows={order.lines} getRowKey={(l) => l.id} empty="—" />
      </section>

      {(nextStatuses.length > 0 || CAN_CANCEL.has(order.status)) && (
        <section className="rounded-card border border-line p-5">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'admin.orders.actions')}
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {nextStatuses.map((s) => (
              <form key={s} action={transitionOrderStatusAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="newStatus" value={s} />
                <SubmitButton variant="lime" pendingLabel={t(locale, 'common.pending')}>
                  → {t(locale, `status.order.${s}` as MessageKey)}
                </SubmitButton>
              </form>
            ))}
            {order.status === 'PENDING_PAYMENT' && (
              <form action={extendPaymentDueAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton variant="outline" pendingLabel={t(locale, 'common.pending')}>
                  {t(locale, 'admin.action.extendPaymentDue')}
                </SubmitButton>
              </form>
            )}
            {CAN_CANCEL.has(order.status) && (
              <form action={cancelOrderAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton
                  variant="danger"
                  pendingLabel={t(locale, 'admin.action.cancelling')}
                  confirmMessage={t(locale, 'admin.action.confirmCancel')}
                >
                  {t(locale, 'admin.action.cancel')}
                </SubmitButton>
              </form>
            )}
          </div>
          {order.status === 'PENDING_PAYMENT' && order.paymentDueAt && (
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-500">
              {t(locale, 'admin.order.paymentDue')}: {order.paymentDueAt.toLocaleString()}
            </p>
          )}
        </section>
      )}

      {payment && (
        <section className="rounded-card border border-line p-5">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'admin.orders.payment')}
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">{t(locale, 'admin.orders.method')}</dt>
              <dd className="font-mono text-ink-950">{payment.method}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">{t(locale, 'admin.col.status')}</dt>
              <dd>
                <StatusBadge domain="payment" status={payment.status} locale={locale} />
              </dd>
            </div>
            {payment.wireReference && (
              <div className="flex justify-between">
                <dt className="text-ink-500">{t(locale, 'admin.orders.wireRef')}</dt>
                <dd className="font-mono text-ink-950">{payment.wireReference}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="rounded-card border border-line p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">{t(locale, 'admin.orders.subtotal')}</dt>
            <dd className="font-mono tabular-nums text-ink-950">
              {formatMoney(order.subtotal, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt className="text-ink-950">{t(locale, 'admin.orders.total')}</dt>
            <dd className="font-mono tabular-nums text-ink-950">
              {formatMoney(order.total, order.currency)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
