import { markInvoicePaidAction } from '@/app/admin/_actions-fase2'
import { AdminPageHeader, type Column, DataTable, StatusBadge } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function AdminInvoicesPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const invoices = await prisma.invoice.findMany({
    include: { organization: true, order: { select: { orderNumber: true } } },
    orderBy: { issuedAt: 'desc' },
    take: 200,
  })

  type Row = (typeof invoices)[number]
  const columns: Column<Row>[] = [
    {
      key: 'number',
      header: t(locale, 'admin.col.number'),
      className: 'font-mono text-xs',
      cell: (inv) => inv.number,
    },
    {
      key: 'customer',
      header: t(locale, 'admin.col.customer'),
      cell: (inv) => inv.organization.name,
    },
    {
      key: 'order',
      header: t(locale, 'admin.col.order'),
      className: 'font-mono text-xs',
      cell: (inv) => inv.order.orderNumber,
    },
    {
      key: 'due',
      header: t(locale, 'admin.col.dueDate'),
      className: 'text-xs',
      cell: (inv) => inv.dueDate.toLocaleDateString(),
    },
    {
      key: 'amount',
      header: t(locale, 'admin.col.amount'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (inv) => formatMoney(inv.amount, inv.currency),
    },
    {
      key: 'status',
      header: t(locale, 'admin.col.status'),
      cell: (inv) => <StatusBadge domain="invoice" status={inv.status} locale={locale} />,
    },
    {
      key: 'payment',
      header: t(locale, 'admin.col.payment'),
      cell: (inv) =>
        inv.status === 'CANCELLED' ? null : (
          <StatusBadge
            domain="payment"
            status={inv.status === 'PAID' ? 'CAPTURED' : 'PENDING'}
            locale={locale}
          />
        ),
    },
    {
      key: 'action',
      header: t(locale, 'admin.col.action'),
      align: 'right',
      cell: (inv) =>
        inv.status === 'PENDING' || inv.status === 'OVERDUE' ? (
          <form action={markInvoicePaidAction} className="inline-flex items-center gap-2">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <input
              name="paidNote"
              placeholder={t(locale, 'admin.invoices.refPlaceholder')}
              aria-label={t(locale, 'admin.invoices.refAria', { number: inv.number })}
              required
              className="w-28 rounded-button border border-ink-100 bg-surface px-2 py-1 text-xs text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <SubmitButton
              variant="outline"
              size="sm"
              pendingLabel={t(locale, 'admin.action.saving')}
            >
              {t(locale, 'admin.action.markPaid')}
            </SubmitButton>
          </form>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t(locale, 'admin.invoices.title')}
        subtitle={t(locale, 'admin.invoices.count', { count: invoices.length })}
      />
      <DataTable columns={columns} rows={invoices} getRowKey={(inv) => inv.id} empty="—" />
    </div>
  )
}
