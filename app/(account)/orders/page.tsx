import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { requireActiveOrgId } from '@/lib/auth/active-org'
import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'
import { ReorderButton } from './ReorderButton'

export const dynamic = 'force-dynamic'

export default async function OrdersListPage() {
  const customer = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: customer.userId })
  const orgId = await requireActiveOrgId()
  const orders = await ordersService.listForOrg(orgId)
  const currency = getStoreConfig().currency.base

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
        {t(locale, 'account.orders.title')}
      </h1>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-ink-500">{t(locale, 'account.orders.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="flex items-stretch gap-3">
              <Link
                href={`/orders/${order.id}`}
                className="flex-1 rounded-card border border-line p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-mono text-sm font-medium text-ink-950">
                      {order.orderNumber}
                    </div>
                    <div className="mt-1 text-xs text-ink-500">
                      {order.placedAt.toLocaleDateString()} · {order.lines.length}{' '}
                      {t(locale, 'account.orders.linesLabel')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-medium tabular-nums text-ink-950">
                      {formatMoney(order.total, currency)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              </Link>
              <div className="flex items-center">
                <ReorderButton orderId={order.id} locale={locale} variant="secondary" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
