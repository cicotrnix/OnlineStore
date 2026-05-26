import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/db/client'
import Link from 'next/link'

export default async function AdminCustomersPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      members: { select: { id: true } },
      addresses: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orgs.length} organización{orgs.length === 1 ? '' : 'es'} registrada
          {orgs.length === 1 ? '' : 's'}.
        </p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Organización</th>
              <th className="text-left px-5 py-3 font-medium">Slug</th>
              <th className="text-left px-5 py-3 font-medium">Miembros</th>
              <th className="text-left px-5 py-3 font-medium">Direcciones</th>
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
                <td className="px-5 py-3 font-mono text-xs">{org.slug}</td>
                <td className="px-5 py-3 tabular-nums">{org.members.length}</td>
                <td className="px-5 py-3 tabular-nums">{org.addresses.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
