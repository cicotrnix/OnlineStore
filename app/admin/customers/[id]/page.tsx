import {
  approveOrganizationAction,
  getTaxCertificateUrlAction,
  rejectOrganizationAction,
  startImpersonationAction,
  uploadTaxCertificateAction,
} from '@/app/admin/_actions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params
  const { auth } = await import('@/lib/auth/config')
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      addresses: true,
    },
  })
  if (!org) notFound()

  const taxDocs = await prisma.taxDocument.findMany({
    where: { organizationId: org.id },
    orderBy: { uploadedAt: 'desc' },
  })

  async function viewCertificateAction(formData: FormData): Promise<void> {
    'use server'
    const url = await getTaxCertificateUrlAction(formData)
    redirect(url)
  }

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
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-medium">Verificación B2B</h2>
            <Badge
              variant={
                org.verificationStatus === 'VERIFIED'
                  ? 'success'
                  : org.verificationStatus === 'REJECTED'
                    ? 'danger'
                    : 'warning'
              }
            >
              {org.verificationStatus}
            </Badge>
            {org.taxExempt && <Badge variant="info">Tax exempt</Badge>}
            {org.verificationSubmittedAt && org.verificationStatus === 'PENDING' && (
              <span className="text-xs text-gray-500">
                Submitted {org.verificationSubmittedAt.toLocaleString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {org.verificationStatus === 'VERIFIED' && org.verifiedAt && (
            <p className="text-xs text-gray-500">
              Verificada el {org.verifiedAt.toLocaleString()} · país {org.country ?? '?'}
            </p>
          )}

          {org.verificationStatus === 'REJECTED' && org.rejectionReason && (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <strong>Motivo de rechazo:</strong> {org.rejectionReason}
            </p>
          )}

          {(org.verificationStatus === 'PENDING' || org.verificationStatus === 'REJECTED') && (
            <div className="flex items-center gap-3 flex-wrap rounded border border-gray-200 bg-gray-50 p-3">
              <form action={approveOrganizationAction}>
                <input type="hidden" name="organizationId" value={org.id} />
                <SubmitButton
                  variant="primary"
                  pendingLabel={t(locale, 'admin.action.approving')}
                  confirmMessage={t(locale, 'admin.confirm.approve', { name: org.name })}
                >
                  {t(locale, 'admin.action.approve')}
                </SubmitButton>
              </form>
              <form action={rejectOrganizationAction} className="flex items-end gap-2">
                <input type="hidden" name="organizationId" value={org.id} />
                <div>
                  <label htmlFor="reason" className="block text-xs text-gray-500 mb-1">
                    {t(locale, 'admin.action.rejectReasonLabel')}
                  </label>
                  <Input
                    id="reason"
                    name="reason"
                    required
                    placeholder={t(locale, 'admin.action.rejectReasonPlaceholder')}
                    className="w-72"
                  />
                </div>
                <SubmitButton variant="danger" pendingLabel={t(locale, 'admin.action.rejecting')}>
                  {t(locale, 'admin.action.reject')}
                </SubmitButton>
              </form>
            </div>
          )}

          {taxDocs.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Documentos</h3>
              <ul className="space-y-2">
                {taxDocs.map((d) => (
                  <li key={d.id} className="text-sm flex items-center gap-3">
                    <Badge variant={d.status === 'APPROVED' ? 'success' : 'warning'}>
                      {d.status}
                    </Badge>
                    <span className="font-mono">{d.type}</span>
                    <span className="text-gray-500">
                      #{d.number} · {d.jurisdiction} · {d.uploadedAt.toLocaleDateString()}
                    </span>
                    <form action={viewCertificateAction} className="ml-auto">
                      <input type="hidden" name="taxDocumentId" value={d.id} />
                      <SubmitButton variant="secondary" pendingLabel="Abriendo…">
                        Ver certificado
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form action={uploadTaxCertificateAction} className="space-y-3 max-w-md">
            <input type="hidden" name="organizationId" value={org.id} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="type" className="block text-xs text-gray-500 mb-1">
                  Tipo
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="US_RESALE_CERT">US Resale Cert</option>
                  <option value="FOREIGN_EQUIV">Equivalente extranjero</option>
                </select>
              </div>
              <div>
                <label htmlFor="country" className="block text-xs text-gray-500 mb-1">
                  País (ISO-2)
                </label>
                <Input
                  id="country"
                  name="country"
                  maxLength={2}
                  placeholder="US"
                  defaultValue={org.country ?? 'US'}
                />
              </div>
              <div>
                <label htmlFor="number" className="block text-xs text-gray-500 mb-1">
                  Número del certificado
                </label>
                <Input id="number" name="number" required />
              </div>
              <div>
                <label htmlFor="jurisdiction" className="block text-xs text-gray-500 mb-1">
                  Jurisdicción
                </label>
                <Input id="jurisdiction" name="jurisdiction" required placeholder="TX, FL, ..." />
              </div>
            </div>
            <div>
              <label htmlFor="file" className="block text-xs text-gray-500 mb-1">
                Archivo (PDF / imagen, máx 10 MB)
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                accept="application/pdf,image/*"
                className="block w-full text-sm"
              />
            </div>
            <SubmitButton pendingLabel="Subiendo…">Subir + auto-aprobar</SubmitButton>
          </form>
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
            <SubmitButton variant="secondary" pendingLabel="Entrando…">
              Ver storefront como esta org
            </SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
