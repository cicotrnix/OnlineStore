import { AdminPageHeader, type Column, DataTable, MetricCard } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { reindexAllAction, retryFailedAction } from './_actions'

export const dynamic = 'force-dynamic'

export default async function AdminSearchPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) notFound()

  const [pending, processing, done, failed, failedRows] = await Promise.all([
    prisma.searchIndexQueue.count({ where: { status: 'PENDING' } }),
    prisma.searchIndexQueue.count({ where: { status: 'PROCESSING' } }),
    prisma.searchIndexQueue.count({ where: { status: 'DONE' } }),
    prisma.searchIndexQueue.count({ where: { status: 'FAILED' } }),
    prisma.searchIndexQueue.findMany({
      where: { status: 'FAILED' },
      orderBy: { enqueuedAt: 'desc' },
      take: 20,
    }),
  ])

  type Row = (typeof failedRows)[number]
  const columns: Column<Row>[] = [
    {
      key: 'product',
      header: t(locale, 'admin.col.product'),
      className: 'font-mono text-xs',
      cell: (r) => r.productId,
    },
    { key: 'action', header: t(locale, 'admin.col.action'), cell: (r) => r.action },
    {
      key: 'attempts',
      header: t(locale, 'admin.search.colAttempts'),
      align: 'right',
      className: 'tabular-nums',
      cell: (r) => r.attempts,
    },
    {
      key: 'error',
      header: t(locale, 'admin.search.colError'),
      className: 'max-w-md truncate text-xs text-red-600',
      cell: (r) => r.lastError ?? '—',
    },
    {
      key: 'retry',
      header: '',
      align: 'right',
      cell: (r) => (
        <form action={retryFailedAction}>
          <input type="hidden" name="queueItemId" value={r.id} />
          <SubmitButton variant="outline" size="sm" pendingLabel={t(locale, 'common.pending')}>
            {t(locale, 'admin.action.retry')}
          </SubmitButton>
        </form>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t(locale, 'admin.search.title')}
        subtitle={t(locale, 'admin.search.subtitle')}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t(locale, 'admin.search.statPending')} value={pending} />
        <MetricCard label={t(locale, 'admin.search.statProcessing')} value={processing} />
        <MetricCard label={t(locale, 'admin.search.statDone')} value={done} />
        <MetricCard
          label={t(locale, 'admin.search.statFailed')}
          value={<span className={failed > 0 ? 'text-red-600' : undefined}>{failed}</span>}
        />
      </section>

      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.search.reindexTitle')}
        </h2>
        <p className="mt-1 text-xs text-ink-500">{t(locale, 'admin.search.reindexHint')}</p>
        <form action={reindexAllAction} className="mt-3">
          <SubmitButton variant="lime" pendingLabel={t(locale, 'admin.action.enqueuing')}>
            {t(locale, 'admin.action.reindexAll')}
          </SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-950">
          {t(locale, 'admin.search.failedTitle')}
        </h2>
        <DataTable
          columns={columns}
          rows={failedRows}
          getRowKey={(r) => r.id}
          empty={t(locale, 'admin.search.noFailed')}
        />
      </section>
    </div>
  )
}
