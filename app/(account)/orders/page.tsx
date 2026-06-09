import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { Card, CardBody } from '@/components/ui/Card'
import { requireActiveOrgId } from '@/lib/auth/active-org'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrdersListPage() {
  const { requireVerifiedCustomer } = await import('@/lib/auth/customer')
  await requireVerifiedCustomer()
  const orgId = await requireActiveOrgId()
  const orders = await ordersService.listForOrg(orgId)

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium tracking-tight">Tus órdenes</h1>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">Aún no hay órdenes en esta organización.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`}>
                <Card className="hover:border-gray-400 transition-colors">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium font-mono text-sm">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {order.placedAt.toLocaleDateString()} · {order.lines.length} línea
                        {order.lines.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm tabular-nums font-medium">
                        {formatMoney(order.total, getStoreConfig().currency.base)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
