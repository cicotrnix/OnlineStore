import { AuthField } from '@/app/(auth)/AuthField'
import { quoteOrReviseAction } from '@/app/admin/_actions-fase2'
import { AdminPageHeader, type Column, DataTable, StatusBadge } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function AdminQuoteDetailPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const q = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      organization: true,
      requestedBy: true,
      quotedBy: true,
    },
  })
  if (!q) notFound()

  const canQuote = q.status === 'SUBMITTED'
  const canRevise = q.status === 'QUOTED'
  const editable = canQuote || canRevise
  const defaultValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  type Line = (typeof q.lines)[number]
  const inputCls =
    'w-24 rounded-button border border-ink-100 bg-surface px-2 py-1 text-right text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent'

  const editColumns: Column<Line>[] = [
    {
      key: 'sku',
      header: t(locale, 'admin.col.sku'),
      className: 'font-mono text-xs text-ink-500',
      cell: (l) => l.sku,
    },
    { key: 'name', header: t(locale, 'admin.col.product'), cell: (l) => l.name },
    {
      key: 'base',
      header: t(locale, 'admin.col.base'),
      align: 'right',
      className: 'font-mono tabular-nums text-ink-500',
      cell: (l) => formatMoney(l.unitPriceBase, q.currency),
    },
    {
      key: 'qty',
      header: t(locale, 'admin.col.qty'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (l) => l.qty,
    },
    {
      key: 'quoted',
      header: t(locale, 'admin.col.quoted'),
      align: 'right',
      cell: (l) => (
        <input
          name={`price[${l.id}]`}
          aria-label={t(locale, 'admin.quotes.quotedPriceFor', { sku: l.sku })}
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={l.unitPriceQuoted?.toString() ?? ''}
          required
          className={inputCls}
        />
      ),
    },
  ]

  const readColumns: Column<Line>[] = [
    {
      key: 'sku',
      header: t(locale, 'admin.col.sku'),
      className: 'font-mono text-xs text-ink-500',
      cell: (l) => l.sku,
    },
    { key: 'name', header: t(locale, 'admin.col.product'), cell: (l) => l.name },
    {
      key: 'price',
      header: t(locale, 'admin.col.price'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (l) =>
        l.unitPriceQuoted
          ? formatMoney(l.unitPriceQuoted, q.currency)
          : formatMoney(l.unitPriceBase, q.currency),
    },
    {
      key: 'qty',
      header: t(locale, 'admin.col.qty'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (l) => l.qty,
    },
    {
      key: 'total',
      header: t(locale, 'admin.col.total'),
      align: 'right',
      className: 'font-mono font-medium tabular-nums',
      cell: (l) => formatMoney(l.lineTotal, q.currency),
    },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title={<span className="font-mono">{q.number}</span>}
          subtitle={`${q.organization.name} · ${q.requestedBy.email} · ${q.createdAt.toLocaleString()}`}
        />
        <StatusBadge domain="quote" status={q.status} locale={locale} />
      </div>

      {q.notes && (
        <section className="rounded-card border border-line p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500">
            {t(locale, 'admin.quotes.customerNotes')}
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-950">{q.notes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-950">
          {canQuote
            ? t(locale, 'admin.quotes.doQuote')
            : canRevise
              ? t(locale, 'admin.quotes.doRevise')
              : t(locale, 'admin.quotes.lines')}
        </h2>

        {editable ? (
          <form action={quoteOrReviseAction} className="space-y-4">
            <input type="hidden" name="quoteId" value={q.id} />
            <input type="hidden" name="action" value={canRevise ? 'revise' : 'quote'} />
            <DataTable columns={editColumns} rows={q.lines} getRowKey={(l) => l.id} empty="—" />
            <div className="grid gap-3 sm:grid-cols-2">
              <AuthField
                name="validUntil"
                label={t(locale, 'admin.quotes.validUntil')}
                type="date"
                required
                defaultValue={q.validUntil?.toISOString().slice(0, 10) ?? defaultValidUntil}
              />
            </div>
            <div>
              <label
                htmlFor="adminNotes"
                className="block text-xs font-medium uppercase tracking-wide text-ink-500"
              >
                {t(locale, 'admin.quotes.internalNotes')}
              </label>
              <textarea
                id="adminNotes"
                name="adminNotes"
                rows={2}
                defaultValue={q.adminNotes ?? ''}
                className="mt-1 w-full rounded-button border border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex justify-end">
              <SubmitButton variant="lime" pendingLabel={t(locale, 'admin.action.sending')}>
                {canRevise ? t(locale, 'admin.action.revise') : t(locale, 'admin.action.quote')}
              </SubmitButton>
            </div>
          </form>
        ) : (
          <DataTable columns={readColumns} rows={q.lines} getRowKey={(l) => l.id} empty="—" />
        )}
      </section>
    </div>
  )
}
