import {
  AdminPageHeader,
  type Column,
  DataTable,
  FilterBar,
  FilterTab,
  StatusBadge,
  type StatusTone,
} from '@/components/admin'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { type MessageKey, getLocale, t } from '@/lib/i18n'
import type { Prisma, VerificationStatus } from '@prisma/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ status?: string }> }

const FILTERS: Array<{ key: string; labelKey: MessageKey; status?: VerificationStatus }> = [
  { key: 'all', labelKey: 'admin.customers.filter.all' },
  { key: 'pending', labelKey: 'admin.customers.filter.pending', status: 'PENDING' },
  { key: 'verified', labelKey: 'admin.customers.filter.verified', status: 'VERIFIED' },
  { key: 'rejected', labelKey: 'admin.customers.filter.rejected', status: 'REJECTED' },
]

const VERIF_TONE: Record<VerificationStatus, StatusTone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const activeFilter = FILTERS.find((f) => f.key === status) ?? FILTERS[0]!
  const where: Prisma.OrganizationWhereInput = activeFilter.status
    ? { verificationStatus: activeFilter.status }
    : {}

  const orgs = await prisma.organization.findMany({
    where,
    include: { members: { select: { id: true } }, addresses: { select: { id: true } } },
    orderBy: [{ verificationStatus: 'asc' }, { name: 'asc' }],
  })

  type Row = (typeof orgs)[number]
  const columns: Column<Row>[] = [
    {
      key: 'org',
      header: t(locale, 'admin.customers.col.org'),
      cell: (o) => (
        <Link
          href={`/admin/customers/${o.id}`}
          className="font-medium text-lime-deep hover:underline"
        >
          {o.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t(locale, 'admin.col.status'),
      cell: (o) => (
        <StatusBadge tone={VERIF_TONE[o.verificationStatus]}>
          {t(locale, `account.verification.${o.verificationStatus}` as MessageKey)}
        </StatusBadge>
      ),
    },
    {
      key: 'slug',
      header: t(locale, 'admin.customers.col.slug'),
      className: 'font-mono text-xs',
      cell: (o) => o.slug,
    },
    {
      key: 'members',
      header: t(locale, 'admin.customers.col.members'),
      align: 'right',
      className: 'tabular-nums',
      cell: (o) => o.members.length,
    },
    {
      key: 'addresses',
      header: t(locale, 'admin.customers.col.addresses'),
      align: 'right',
      className: 'tabular-nums',
      cell: (o) => o.addresses.length,
    },
    {
      key: 'submitted',
      header: t(locale, 'admin.customers.col.submitted'),
      className: 'text-xs text-ink-500',
      cell: (o) => o.verificationSubmittedAt?.toLocaleDateString() ?? '—',
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t(locale, 'admin.customers.title')}
        subtitle={t(locale, 'admin.customers.count', { count: orgs.length })}
      />
      <FilterBar>
        {FILTERS.map((f) => (
          <FilterTab
            key={f.key}
            href={f.key === 'all' ? '/admin/customers' : `/admin/customers?status=${f.key}`}
            active={activeFilter.key === f.key}
          >
            {t(locale, f.labelKey)}
          </FilterTab>
        ))}
      </FilterBar>
      <DataTable columns={columns} rows={orgs} getRowKey={(o) => o.id} empty="—" />
    </div>
  )
}
