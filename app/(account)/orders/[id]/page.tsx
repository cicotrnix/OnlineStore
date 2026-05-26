import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { requireAuth } from '@/lib/auth/helpers'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  await requireAuth()
  const { id } = await params
  const order = await ordersService.findById(id)
  if (!order) notFound()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Orden <span className="font-mono">{order.orderNumber}</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {order.organization.name} · Colocada por {order.placedBy.email} ·{' '}
            {order.placedAt.toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card className="mt-8">
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

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-medium">Direcciones</h2>
        </CardHeader>
        <CardBody className="grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Facturación</div>
            <div className="mt-1">
              <strong>{order.billingAddress.label}</strong>
              <div className="text-gray-600">{order.billingAddress.recipient}</div>
              <div className="text-gray-600">{order.billingAddress.line1}</div>
              {order.billingAddress.line2 && (
                <div className="text-gray-600">{order.billingAddress.line2}</div>
              )}
              <div className="text-gray-600">
                {order.billingAddress.city}, {order.billingAddress.state ?? ''}{' '}
                {order.billingAddress.postalCode}
              </div>
              <div className="text-gray-600">{order.billingAddress.country}</div>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Envío</div>
            <div className="mt-1">
              <strong>{order.shippingAddress.label}</strong>
              <div className="text-gray-600">{order.shippingAddress.recipient}</div>
              <div className="text-gray-600">{order.shippingAddress.line1}</div>
              {order.shippingAddress.line2 && (
                <div className="text-gray-600">{order.shippingAddress.line2}</div>
              )}
              <div className="text-gray-600">
                {order.shippingAddress.city}, {order.shippingAddress.state ?? ''}{' '}
                {order.shippingAddress.postalCode}
              </div>
              <div className="text-gray-600">{order.shippingAddress.country}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <dl className="space-y-2 text-sm">
            {order.poNumber && (
              <div className="flex justify-between">
                <dt className="text-gray-500">PO</dt>
                <dd className="font-mono">{order.poNumber}</dd>
              </div>
            )}
            {order.notes && (
              <div>
                <dt className="text-gray-500">Notas</dt>
                <dd className="mt-1 whitespace-pre-wrap">{order.notes}</dd>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.total, order.currency)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}
