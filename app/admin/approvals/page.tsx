import { AdminPageHeader, type Column, DataTable, StatusBadge } from '@/components/admin'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { getStoreConfig } from '@/stores'

export const dynamic = 'force-dynamic'

export default async function AdminApprovalsPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const requests = await prisma.approvalRequest.findMany({
    include: { organization: true, requestedBy: true, decidedBy: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const currency = getStoreConfig().currency.base
  const pending = requests.filter((r) => r.status === 'PENDING').length

  type Row = (typeof requests)[number]
  const columns: Column<Row>[] = [
    { key: 'customer', header: t(locale, 'admin.col.customer'), cell: (r) => r.organization.name },
    {
      key: 'subject',
      header: t(locale, 'admin.col.subject'),
      className: 'text-xs uppercase',
      cell: (r) => r.subjectType,
    },
    {
      key: 'amount',
      header: t(locale, 'admin.col.amount'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (r) => formatMoney(r.amount, currency),
    },
    {
      key: 'threshold',
      header: t(locale, 'admin.col.threshold'),
      align: 'right',
      className: 'font-mono tabular-nums text-ink-500',
      cell: (r) => formatMoney(r.threshold, currency),
    },
    {
      key: 'requester',
      header: t(locale, 'admin.col.requester'),
      className: 'text-xs',
      cell: (r) => r.requestedBy.email,
    },
    {
      key: 'status',
      header: t(locale, 'admin.col.status'),
      cell: (r) => <StatusBadge domain="approval" status={r.status} locale={locale} />,
    },
    {
      key: 'created',
      header: t(locale, 'admin.col.created'),
      className: 'text-xs text-ink-500',
      cell: (r) => r.createdAt.toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t(locale, 'admin.approvals.title')}
        subtitle={t(locale, 'admin.approvals.pendingCount', { count: pending })}
      />
      <DataTable columns={columns} rows={requests} getRowKey={(r) => r.id} empty="—" />
    </div>
  )
}
