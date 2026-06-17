import { AuthField } from '@/app/(auth)/AuthField'
import {
  grantCatalogAccessAction,
  revokeCatalogAccessAction,
  setCreditAction,
} from '@/app/admin/_actions-fase2'
import { AdminPageHeader } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { getStoreConfig } from '@/stores'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const SELECT_CLS =
  'mt-1 w-full rounded-button border border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent'

export default async function AdminCustomerCreditPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      catalogAccess: {
        include: {
          product: { select: { name: true, sku: true } },
          category: { select: { name: true } },
        },
      },
    },
  })
  if (!org) notFound()

  const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true } })
  const categories = await prisma.category.findMany({ select: { id: true, name: true } })
  const currency = getStoreConfig().currency.base

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader title={t(locale, 'admin.credit.title', { org: org.name })} />

      {/* Crédito y aprobaciones */}
      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.credit.creditApprovals')}
        </h2>
        <form action={setCreditAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="orgId" value={org.id} />
          <AuthField
            name="creditLimit"
            label={t(locale, 'admin.credit.limit')}
            type="number"
            step="0.01"
            min={0}
            defaultValue={org.creditLimit?.toString() ?? ''}
            placeholder={t(locale, 'admin.credit.limitHint')}
          />
          <div>
            <label
              htmlFor="paymentTerms"
              className="block text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              {t(locale, 'admin.credit.terms')}
            </label>
            <select
              id="paymentTerms"
              name="paymentTerms"
              defaultValue={org.paymentTerms}
              className={SELECT_CLS}
            >
              <option value="PREPAID">{t(locale, 'admin.credit.termsPrepaid')}</option>
              <option value="NET_15">Net 15</option>
              <option value="NET_30">Net 30</option>
              <option value="NET_60">Net 60</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <AuthField
              name="approvalThreshold"
              label={t(locale, 'admin.credit.threshold')}
              type="number"
              step="0.01"
              min={0}
              defaultValue={org.approvalThreshold?.toString() ?? ''}
              placeholder={t(locale, 'admin.credit.thresholdHint')}
            />
          </div>
          <div className="flex items-center justify-between sm:col-span-2">
            <p className="text-xs text-ink-500">
              {t(locale, 'admin.credit.currentUsage')}{' '}
              <strong className="font-mono tabular-nums text-ink-950">
                {formatMoney(org.creditUsed, currency)}
              </strong>
            </p>
            <SubmitButton variant="lime" pendingLabel={t(locale, 'admin.action.saving')}>
              {t(locale, 'admin.action.save')}
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* Acceso a catálogo privado */}
      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.credit.catalogAccess')}
        </h2>
        <ul className="mt-3 space-y-2">
          {org.catalogAccess.length === 0 ? (
            <li className="text-sm text-ink-500">{t(locale, 'admin.credit.noGrants')}</li>
          ) : (
            org.catalogAccess.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-sm text-ink-950"
              >
                <span>
                  {a.product
                    ? t(locale, 'admin.credit.grantedProduct', {
                        name: a.product.name,
                        sku: a.product.sku,
                      })
                    : t(locale, 'admin.credit.grantedCategory', { name: a.category?.name ?? '?' })}
                </span>
                <form action={revokeCatalogAccessAction}>
                  <input type="hidden" name="orgId" value={org.id} />
                  {a.productId && <input type="hidden" name="productId" value={a.productId} />}
                  {a.categoryId && <input type="hidden" name="categoryId" value={a.categoryId} />}
                  <SubmitButton
                    variant="outline"
                    size="sm"
                    pendingLabel={t(locale, 'common.pending')}
                  >
                    {t(locale, 'admin.action.remove')}
                  </SubmitButton>
                </form>
              </li>
            ))
          )}
        </ul>

        <form action={grantCatalogAccessAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="orgId" value={org.id} />
          <div>
            <label
              htmlFor="grantProduct"
              className="block text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              {t(locale, 'admin.credit.productOneOrOther')}
            </label>
            <select id="grantProduct" name="productId" className={SELECT_CLS}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="grantCategory"
              className="block text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              {t(locale, 'admin.credit.category')}
            </label>
            <select id="grantCategory" name="categoryId" className={SELECT_CLS}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <SubmitButton
              variant="lime"
              className="w-full"
              pendingLabel={t(locale, 'admin.action.granting')}
            >
              {t(locale, 'admin.action.grantAccess')}
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  )
}
