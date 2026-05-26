import { Card, CardBody } from '@/components/ui/Card'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import { customersService } from '@/modules/customers'
import storeConfig from '@/store.config'
import { Decimal } from '@prisma/client/runtime/library'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const user = await requireAuth()
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
      label: 'Cotizaciones pendientes',
      value: String(pendingQuotes),
      href: '/admin/quotes',
      show: rfqOn,
    },
    {
      label: 'Aprobaciones pendientes',
      value: String(pendingApprovals),
      href: '/admin/approvals',
      show: approvalsOn,
    },
    {
      label: 'Facturas vencidas',
      value: String(overdueInvoices),
      href: '/admin/invoices',
      show: creditOn,
    },
    {
      label: 'Saldo abierto (pendiente + overdue)',
      value: formatMoney(openInvoiceAgg._sum?.amount ?? new Decimal(0), storeConfig.currency.base),
      href: '/admin/invoices',
      show: creditOn,
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-medium">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">Welcome back, {user.email}.</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets
          .filter((w) => w.show)
          .map((w) => (
            <Link key={w.label} href={w.href}>
              <Card className="hover:border-gray-400 transition-colors">
                <CardBody>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{w.label}</div>
                  <div className="mt-2 text-2xl font-medium tabular-nums">{w.value}</div>
                </CardBody>
              </Card>
            </Link>
          ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-500">Your organizations</h2>
        {orgs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No organizations yet. Create one in{' '}
            <a href="/admin/settings" className="underline">
              settings
            </a>
            .
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {orgs.map((org) => (
              <li key={org.id} className="text-sm">
                <strong>{org.name}</strong> — {org.slug}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
