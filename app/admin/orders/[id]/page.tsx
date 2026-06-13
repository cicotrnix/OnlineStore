import {
  cancelOrderAction,
  extendPaymentDueAction,
  transitionOrderStatusAction,
} from '@/app/admin/_actions'
import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { PaymentBadge } from '@/components/commerce/PaymentBadge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
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

  // Pago existente (si lo hay).
  const payment = await prisma.payment.findUnique({
    where: { orderId: order.id },
    select: { id: true, status: true, method: true, wireReference: true },
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight font-mono">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {order.organization.name} · {order.placedBy.email} · {order.placedAt.toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Líneas</h2>
        </CardHeader>
        <CardBody className="px-0 py-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 font-medium">SKU</th>
                <th className="text-left px-5 py-2 font-medium">Producto</th>
                <th className="text-right px-5 py-2 font-medium">Precio</th>
                <th className="text-right px-5 py-2 font-medium">Cant.</th>
                <th className="text-right px-5 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} className="border-t border-gray-100">
                  <td className="px-5 py-2 font-mono text-xs">{line.sku}</td>
                  <td className="px-5 py-2">{line.name}</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatMoney(line.unitPrice, order.currency)}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">{line.quantity}</td>
                  <td className="px-5 py-2 text-right tabular-nums font-medium">
                    {formatMoney(line.lineTotal, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {(nextStatuses.length > 0 || CAN_CANCEL.has(order.status)) && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Acciones</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-3">
            {nextStatuses.map((s) => (
              <form key={s} action={transitionOrderStatusAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="newStatus" value={s} />
                <SubmitButton pendingLabel={t(locale, 'common.pending')}>→ {s}</SubmitButton>
              </form>
            ))}
            {order.status === 'PENDING_PAYMENT' && (
              <form action={extendPaymentDueAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton pendingLabel={t(locale, 'common.pending')}>
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
          </CardBody>
          {order.status === 'PENDING_PAYMENT' && order.paymentDueAt && (
            <CardBody className="border-t border-gray-100 text-xs text-gray-500">
              {t(locale, 'admin.order.paymentDue')}: {order.paymentDueAt.toLocaleString()}
            </CardBody>
          )}
        </Card>
      )}

      {payment && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Pago</h2>
          </CardHeader>
          <CardBody className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Método</span>
              <span className="font-mono">{payment.method}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Estado</span>
              <PaymentBadge
                paymentStatus={payment.status === 'CAPTURED' ? 'CAPTURED' : 'PENDING'}
                locale={locale}
              />
            </div>
            {payment.wireReference && (
              <div className="flex justify-between">
                <span className="text-gray-500">Referencia wire</span>
                <span className="font-mono">{payment.wireReference}</span>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="tabular-nums">{formatMoney(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(order.total, order.currency)}</span>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
