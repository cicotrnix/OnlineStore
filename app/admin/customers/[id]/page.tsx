import { startImpersonationAction } from '@/app/admin/_actions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { prisma } from '@/lib/db/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      addresses: true,
    },
  })
  if (!org) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">{org.name}</h1>
          <p className="mt-1 text-xs text-gray-500 font-mono">{org.slug}</p>
        </div>
        <Link href={`/admin/customers/${org.id}/prices`}>
          <Button variant="secondary">Gestionar precios</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Miembros</h2>
        </CardHeader>
        <CardBody className="px-0 py-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Email</th>
                <th className="text-left px-5 py-2 font-medium">Rol</th>
                <th className="text-left px-5 py-2 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody>
              {org.members.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-5 py-2">{m.user.email}</td>
                  <td className="px-5 py-2">
                    <Badge variant="info">{m.role}</Badge>
                  </td>
                  <td className="px-5 py-2 text-xs text-gray-500">
                    {m.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Direcciones</h2>
        </CardHeader>
        <CardBody>
          {org.addresses.length === 0 ? (
            <p className="text-sm text-gray-500">Sin direcciones.</p>
          ) : (
            <ul className="space-y-3">
              {org.addresses.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <strong>{a.label}</strong>
                    {a.isDefaultBilling && <Badge variant="info">Facturación</Badge>}
                    {a.isDefaultShipping && <Badge variant="info">Envío</Badge>}
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''} · {a.city}
                    {a.state ? `, ${a.state}` : ''} {a.postalCode}, {a.country}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Impersonation</h2>
        </CardHeader>
        <CardBody>
          <form action={startImpersonationAction} className="flex gap-2 items-end">
            <input type="hidden" name="orgId" value={org.id} />
            <div className="flex-1">
              <label htmlFor="reason" className="text-xs uppercase tracking-wide text-gray-500">
                Motivo (opcional)
              </label>
              <Input id="reason" name="reason" placeholder="Soporte ticket #..." className="mt-1" />
            </div>
            <Button type="submit" variant="secondary">
              Ver storefront como esta org
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
