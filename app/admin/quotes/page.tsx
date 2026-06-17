import { AdminPageHeader, type Column, DataTable, StatusBadge } from '@/components/admin'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminQuotesPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const quotes = await prisma.quote.findMany({
    include: { organization: true, requestedBy: true, lines: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  type Row = (typeof quotes)[number]
  const columns: Column<Row>[] = [
    {
      key: 'number',
      header: t(locale, 'admin.col.number'),
      className: 'font-mono text-xs',
      cell: (q) => (
        <Link href={`/admin/quotes/${q.id}`} className="text-lime-deep hover:underline">
          {q.number}
        </Link>
      ),
    },
    { key: 'customer', header: t(locale, 'admin.col.customer'), cell: (q) => q.organization.name },
    {
      key: 'requester',
      header: t(locale, 'admin.col.requester'),
      className: 'text-xs',
      cell: (q) => q.requestedBy.email,
    },
    {
      key: 'status',
      header: t(locale, 'admin.col.status'),
      cell: (q) => <StatusBadge domain="quote" status={q.status} locale={locale} />,
    },
    {
      key: 'total',
      header: t(locale, 'admin.col.total'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (q) => formatMoney(q.total, q.currency),
    },
    {
      key: 'created',
      header: t(locale, 'admin.col.created'),
      className: 'text-xs text-ink-500',
      cell: (q) => q.createdAt.toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t(locale, 'admin.quotes.title')}
        subtitle={t(locale, 'admin.quotes.count', { count: quotes.length })}
      />
      <DataTable columns={columns} rows={quotes} getRowKey={(q) => q.id} empty="—" />
    </div>
  )
}
