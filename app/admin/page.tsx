import { AdminPageHeader, MetricCard } from '@/components/admin'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { customersService } from '@/modules/customers'
import { getStoreConfig } from '@/stores'
import { Decimal } from '@prisma/client/runtime/library'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const orgs = await customersService.listForUser(user.id)
  const rfqOn = isFeatureEnabled('rfq')
  const approvalsOn = isFeatureEnabled('approvals')
  const creditOn = isFeatureEnabled('credit')

  const [pendingQuotes, pendingApprovals, overdueInvoices, openInvoiceAgg] = await Promise.all([
    rfqOn ? prisma.quote.count({ where: { status: 'SUBMITTED' } }) : Promise.resolve(0),
    approvalsOn
      ? prisma.approvalRequest.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),
    creditOn ? prisma.invoice.count({ where: { status: 'OVERDUE' } }) : Promise.resolve(0),
    creditOn
      ? prisma.invoice.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
        })
      : Promise.resolve({ _sum: { amount: null } }),
  ])

  const widgets: Array<{ label: string; value: string; href: string; show: boolean }> = [
    {
      label: t(locale, 'admin.dashboard.pendingQuotes'),
      value: String(pendingQuotes),
      href: '/admin/quotes',
      show: rfqOn,
    },
    {
      label: t(locale, 'admin.dashboard.pendingApprovals'),
      value: String(pendingApprovals),
      href: '/admin/approvals',
      show: approvalsOn,
    },
    {
      label: t(locale, 'admin.dashboard.overdueInvoices'),
      value: String(overdueInvoices),
      href: '/admin/invoices',
      show: creditOn,
    },
    {
      label: t(locale, 'admin.dashboard.openBalance'),
      value: formatMoney(
        openInvoiceAgg._sum?.amount ?? new Decimal(0),
        getStoreConfig().currency.base
      ),
      href: '/admin/invoices',
      show: creditOn,
    },
  ]

  return (
    <div>
      <AdminPageHeader
        title={t(locale, 'admin.dashboard.title')}
        subtitle={t(locale, 'admin.dashboard.welcome', { email: user.email ?? '' })}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets
          .filter((w) => w.show)
          .map((w) => (
            <MetricCard key={w.label} label={w.label} value={w.value} href={w.href} />
          ))}
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {t(locale, 'admin.dashboard.orgsTitle')}
        </h2>
        {orgs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">
            {t(locale, 'admin.dashboard.noOrgs')}{' '}
            <Link href="/admin/settings" className="font-medium text-lime-deep hover:underline">
              {t(locale, 'admin.dashboard.createInSettings')}
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line">
            {orgs.map((org) => (
              <li key={org.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <strong className="font-medium text-ink-950">{org.name}</strong>
                <span className="font-mono text-xs text-ink-500">{org.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
