import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/db/client'
import type { Prisma, VerificationStatus } from '@prisma/client'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{ status?: string }>
}

const STATUS_FILTERS: Array<{ key: string; label: string; status?: VerificationStatus }> = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendientes', status: 'PENDING' },
  { key: 'verified', label: 'Verificados', status: 'VERIFIED' },
  { key: 'rejected', label: 'Rechazados', status: 'REJECTED' },
]

const STATUS_VARIANT: Record<VerificationStatus, 'success' | 'warning' | 'danger'> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const activeFilter = STATUS_FILTERS.find((f) => f.key === status) ?? STATUS_FILTERS[0]!
  const where: Prisma.OrganizationWhereInput = activeFilter.status
    ? { verificationStatus: activeFilter.status }
    : {}

  const orgs = await prisma.organization.findMany({
    where,
    include: {
      members: { select: { id: true } },
      addresses: { select: { id: true } },
    },
    // PENDING primero (revisar primero lo que requiere acción).
    orderBy: [{ verificationStatus: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orgs.length} organización{orgs.length === 1 ? '' : 'es'}.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/admin/customers' : `/admin/customers?status=${f.key}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeFilter.key === f.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Organización</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-left px-5 py-3 font-medium">Slug</th>
              <th className="text-left px-5 py-3 font-medium">Miembros</th>
              <th className="text-left px-5 py-3 font-medium">Direcciones</th>
              <th className="text-left px-5 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link href={`/admin/customers/${org.id}`} className="font-medium hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={STATUS_VARIANT[org.verificationStatus]}>
                    {org.verificationStatus}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{org.slug}</td>
                <td className="px-5 py-3 tabular-nums">{org.members.length}</td>
                <td className="px-5 py-3 tabular-nums">{org.addresses.length}</td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {org.verificationSubmittedAt?.toLocaleDateString() ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
