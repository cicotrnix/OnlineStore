import { AdminPageHeader, type Column, DataTable, StatusBadge } from '@/components/admin'
import { requireAuth } from '@/lib/auth/helpers'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { ordersService } from '@/modules/orders'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const orders = await ordersService.listAll()
  const currency = getStoreConfig().currency.base

  type Row = (typeof orders)[number]
  const columns: Column<Row>[] = [
    {
      key: 'number',
      header: t(locale, 'admin.col.number'),
      className: 'font-mono text-xs',
      cell: (o) => (
        <Link href={`/admin/orders/${o.id}`} className="text-lime-deep hover:underline">
          {o.orderNumber}
        </Link>
      ),
    },
    { key: 'customer', header: t(locale, 'admin.col.customer'), cell: (o) => o.organization.name },
    {
      key: 'date',
      header: t(locale, 'admin.col.date'),
      className: 'text-xs text-ink-500',
      cell: (o) => o.placedAt.toLocaleDateString(),
    },
    {
      key: 'total',
      header: t(locale, 'admin.col.total'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (o) => formatMoney(o.total, currency),
    },
    {
      key: 'status',
      header: t(locale, 'admin.col.status'),
      cell: (o) => <StatusBadge domain="order" status={o.status} locale={locale} />,
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t(locale, 'admin.orders.title')}
        subtitle={t(locale, 'admin.orders.count', { count: orders.length })}
      />
      <DataTable columns={columns} rows={orders} getRowKey={(o) => o.id} empty="—" />
    </div>
  )
}
