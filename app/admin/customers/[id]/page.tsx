import { AuthField } from '@/app/(auth)/AuthField'
import {
  approveOrganizationAction,
  getTaxCertificateUrlAction,
  rejectOrganizationAction,
  startImpersonationAction,
  verifyOrganizationAction,
} from '@/app/admin/_actions'
import {
  AdminPageHeader,
  type Column,
  DataTable,
  StatusBadge,
  type StatusTone,
} from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { prisma } from '@/lib/db/client'
import { type MessageKey, getLocale, t } from '@/lib/i18n'
import type { VerificationStatus } from '@prisma/client'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

const VERIF_TONE: Record<VerificationStatus, StatusTone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
}

const SELECT_CLS =
  'mt-1 block w-full rounded-button border border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent'

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params
  const { auth } = await import('@/lib/auth/config')
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { members: { include: { user: true } }, addresses: true },
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

  type Member = (typeof org.members)[number]
  const memberColumns: Column<Member>[] = [
    { key: 'email', header: t(locale, 'admin.customers.col.email'), cell: (m) => m.user.email },
    {
      key: 'role',
      header: t(locale, 'admin.customers.col.role'),
      cell: (m) => (
        <span className="rounded-button bg-ink-950/5 px-2 py-0.5 font-mono text-xs text-ink-950">
          {m.role}
        </span>
      ),
    },
    {
      key: 'since',
      header: t(locale, 'admin.customers.col.since'),
      className: 'text-xs text-ink-500',
      cell: (m) => m.createdAt.toLocaleDateString(),
    },
  ]

  const showVerifyActions =
    org.verificationStatus === 'PENDING' || org.verificationStatus === 'REJECTED'

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader
        title={org.name}
        subtitle={<span className="font-mono">{org.slug}</span>}
        action={
          <Link
            href={`/admin/customers/${org.id}/prices`}
            className="inline-flex items-center justify-center rounded-button border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-700 hover:border-accent hover:text-ink-950"
          >
            {t(locale, 'admin.customers.managePrices')}
          </Link>
        }
      />

      {/* Miembros */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-950">
          {t(locale, 'admin.customers.members')}
        </h2>
        <DataTable columns={memberColumns} rows={org.members} getRowKey={(m) => m.id} empty="—" />
      </section>

      {/* Direcciones */}
      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.customers.addresses')}
        </h2>
        {org.addresses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">{t(locale, 'admin.customers.noAddresses')}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {org.addresses.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <strong className="text-ink-950">{a.label}</strong>
                  {a.isDefaultBilling && (
                    <span className="rounded-button bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-lime-deep">
                      {t(locale, 'admin.customers.billing')}
                    </span>
                  )}
                  {a.isDefaultShipping && (
                    <span className="rounded-button bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-lime-deep">
                      {t(locale, 'admin.customers.shipping')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-ink-500">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''} · {a.city}
                  {a.state ? `, ${a.state}` : ''} {a.postalCode}, {a.country}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Verificación B2B */}
      <section className="rounded-card border border-line p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'admin.customers.b2bVerification')}
          </h2>
          <StatusBadge tone={VERIF_TONE[org.verificationStatus]}>
            {t(locale, `account.verification.${org.verificationStatus}` as MessageKey)}
          </StatusBadge>
          {org.taxExempt && (
            <span className="rounded-button bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-lime-deep">
              {t(locale, 'admin.customers.taxExempt')}
            </span>
          )}
          {org.verificationSubmittedAt && org.verificationStatus === 'PENDING' && (
            <span className="text-xs text-ink-500">
              {t(locale, 'admin.customers.submittedAt', {
                date: org.verificationSubmittedAt.toLocaleString(),
              })}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {org.verificationStatus === 'VERIFIED' && org.verifiedAt && (
            <p className="text-xs text-ink-500">
              {t(locale, 'admin.customers.verifiedOn', {
                date: org.verifiedAt.toLocaleString(),
                country: org.country ?? '?',
              })}
            </p>
          )}

          {org.verificationStatus === 'REJECTED' && org.rejectionReason && (
            <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <strong>{t(locale, 'admin.customers.rejectionReason')}</strong> {org.rejectionReason}
            </p>
          )}

          {showVerifyActions && (
            <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-muted p-3">
              <form action={approveOrganizationAction}>
                <input type="hidden" name="organizationId" value={org.id} />
                <SubmitButton
                  variant="lime"
                  pendingLabel={t(locale, 'admin.action.approving')}
                  confirmMessage={t(locale, 'admin.confirm.approve', { name: org.name })}
                >
                  {t(locale, 'admin.action.approve')}
                </SubmitButton>
              </form>
              <form action={rejectOrganizationAction} className="flex items-end gap-2">
                <input type="hidden" name="organizationId" value={org.id} />
                <div className="w-72">
                  <AuthField
                    name="reason"
                    label={t(locale, 'admin.action.rejectReasonLabel')}
                    required
                    placeholder={t(locale, 'admin.action.rejectReasonPlaceholder')}
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
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                {t(locale, 'admin.customers.documents')}
              </h3>
              <ul className="space-y-2">
                {taxDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 text-sm">
                    <StatusBadge tone={d.status === 'APPROVED' ? 'success' : 'warning'}>
                      {d.status}
                    </StatusBadge>
                    <span className="font-mono">{d.type}</span>
                    <span className="text-ink-500">
                      #{d.number} · {d.jurisdiction} · {d.uploadedAt.toLocaleDateString()}
                    </span>
                    <form action={viewCertificateAction} className="ml-auto">
                      <input type="hidden" name="taxDocumentId" value={d.id} />
                      <SubmitButton
                        variant="outline"
                        pendingLabel={t(locale, 'admin.action.opening')}
                      >
                        {t(locale, 'admin.action.viewCert')}
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form
            action={verifyOrganizationAction}
            encType="multipart/form-data"
            className="max-w-md space-y-4"
          >
            <input type="hidden" name="organizationId" value={org.id} />

            {/* Read-only: tax ID declared by the business — admin uses this to look up the registry */}
            {(org.taxId ?? org.taxIdCountry) && (
              <div className="rounded-card border border-line bg-muted p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">
                  {t(locale, 'admin.customers.taxIdDeclared')}
                </p>
                <p className="font-mono text-ink-950">
                  {org.taxIdCountry ? `[${org.taxIdCountry}] ` : ''}
                  {org.taxId ?? '—'}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="docType"
                className="block text-xs font-medium uppercase tracking-wide text-ink-500"
              >
                {t(locale, 'admin.customers.docType')}
              </label>
              <select id="docType" name="docType" required className={SELECT_CLS}>
                <option value="BUSINESS_REGISTRY_PROOF">
                  {t(locale, 'admin.customers.docTypeBusinessRegistry')}
                </option>
                <option value="US_RESALE_CERT">
                  {t(locale, 'admin.customers.docTypeUsResale')}
                </option>
                <option value="FOREIGN_EQUIV">
                  {t(locale, 'admin.customers.docTypeForeign')}
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="file"
                className="block text-xs font-medium uppercase tracking-wide text-ink-500"
              >
                {t(locale, 'admin.customers.file')}
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                accept="image/*"
                className="mt-1 block w-full text-sm text-ink-700"
              />
            </div>

            <SubmitButton variant="lime" pendingLabel={t(locale, 'admin.action.uploading')}>
              {t(locale, 'admin.action.uploadAndApprove')}
            </SubmitButton>
          </form>
        </div>
      </section>

      {/* Impersonation */}
      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.customers.impersonation')}
        </h2>
        <form action={startImpersonationAction} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="orgId" value={org.id} />
          <div className="flex-1">
            <AuthField
              name="reason"
              label={t(locale, 'admin.customers.reasonOptional')}
              placeholder={t(locale, 'admin.customers.impersonationPlaceholder')}
            />
          </div>
          <SubmitButton variant="outline" pendingLabel={t(locale, 'admin.action.entering')}>
            {t(locale, 'admin.action.viewAsOrg')}
          </SubmitButton>
        </form>
      </section>
    </div>
  )
}
