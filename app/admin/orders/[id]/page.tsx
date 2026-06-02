import {
  cancelOrderAction,
  reconcileWireAction,
  transitionOrderStatusAction,
} from '@/app/admin/_actions'
import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { prisma } from '@/lib/db/client'
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
  const order = await ordersService.findById(id)
  if (!order) notFound()

  const nextStatuses = TRANSITIONS[order.status] ?? []

  // Pago existente (si lo hay) — Fase 5: para decidir si exponer reconcileWire.
  const payment = await prisma.payment.findUnique({
    where: { orderId: order.id },
    select: { id: true, status: true, method: true, wireReference: true },
  })
  const canReconcileWire =
    order.status === 'PENDING_PAYMENT' &&
    (!payment || (payment.status === 'PENDING' && payment.method !== 'STRIPE_CARD'))

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
                <Button type="submit">→ {s}</Button>
              </form>
            ))}
            {CAN_CANCEL.has(order.status) && (
              <form action={cancelOrderAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <Button type="submit" variant="danger">
                  Cancelar orden
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {canReconcileWire && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Conciliar wire / ACH</h2>
            <p className="mt-1 text-xs text-gray-500">
              Para confirmar pago vía transferencia bancaria. El monto debe coincidir exactamente
              con el total. Mismatch lanza error y no se postea.
            </p>
          </CardHeader>
          <CardBody>
            <form action={reconcileWireAction} className="space-y-3 max-w-sm">
              <input type="hidden" name="orderId" value={order.id} />
              <div>
                <label htmlFor="amount" className="block text-xs text-gray-500 mb-1">
                  Monto recibido (USD)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={order.total.toString()}
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="wireReference" className="block text-xs text-gray-500 mb-1">
                  Referencia del wire
                </label>
                <input
                  id="wireReference"
                  name="wireReference"
                  type="text"
                  required
                  placeholder="ej: WR-2026-06-001"
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <Button type="submit">Conciliar wire</Button>
            </form>
          </CardBody>
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
            <div className="flex justify-between">
              <span className="text-gray-500">Estado</span>
              <span className="font-mono">{payment.status}</span>
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
