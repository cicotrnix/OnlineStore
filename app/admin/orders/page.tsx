import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { Card } from '@/components/ui/Card'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import storeConfig from '@/store.config'
import Link from 'next/link'

export default async function AdminOrdersPage() {
  const orders = await ordersService.listAll()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Órdenes</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orders.length} orden{orders.length === 1 ? '' : 'es'} total.
        </p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Número</th>
              <th className="text-left px-5 py-3 font-medium">Cliente</th>
              <th className="text-left px-5 py-3 font-medium">Fecha</th>
              <th className="text-left px-5 py-3 font-medium">Total</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs">
                  <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-5 py-3">{order.organization.name}</td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {order.placedAt.toLocaleDateString()}
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {formatMoney(order.total, storeConfig.currency.base)}
                </td>
                <td className="px-5 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
