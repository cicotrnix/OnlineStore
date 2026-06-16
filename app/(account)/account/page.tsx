import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { type Locale, getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { customersService } from '@/modules/customers'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="text-right text-sm text-ink-950">{children}</dd>
    </div>
  )
}

function localeLabel(locale: Locale, value: string | null): string {
  return value === 'es-419' ? t(locale, 'account.locale.es') : t(locale, 'account.locale.en')
}

export default async function AccountOverviewPage() {
  const state = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: state.userId })

  const [user, org, role] = await Promise.all([
    prisma.user.findUnique({
      where: { id: state.userId },
      select: { name: true, email: true, preferredLocale: true },
    }),
    prisma.organization.findUnique({
      where: { id: state.orgId },
      select: {
        name: true,
        verificationStatus: true,
        taxExempt: true,
        paymentTerms: true,
        creditLimit: true,
      },
    }),
    customersService.getMemberRole(state.orgId, state.userId),
  ])

  const currency = getStoreConfig().currency.base
  const quickLinks: Array<{ href: string; label: string }> = [
    { href: '/orders', label: t(locale, 'account.overview.orders') },
    ...(isFeatureEnabled('credit')
      ? [{ href: '/invoices', label: t(locale, 'account.overview.invoices') }]
      : []),
    ...(isFeatureEnabled('rfq')
      ? [{ href: '/quotes', label: t(locale, 'account.overview.quotes') }]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Identidad */}
      <section className="rounded-card border border-line p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'account.overview.identity')}
          </h2>
          <Link
            href="/account/profile"
            className="text-sm font-medium text-lime-deep hover:underline"
          >
            {t(locale, 'account.overview.edit')}
          </Link>
        </div>
        <dl className="mt-3 divide-y divide-line">
          <Row label={t(locale, 'account.overview.name')}>
            {user?.name || (
              <span className="text-ink-300">{t(locale, 'account.overview.notSet')}</span>
            )}
          </Row>
          <Row label={t(locale, 'account.overview.email')}>{user?.email}</Row>
          <Row label={t(locale, 'account.overview.locale')}>
            {localeLabel(locale, user?.preferredLocale ?? null)}
          </Row>
        </dl>
      </section>

      {/* Organización */}
      <section className="rounded-card border border-line p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'account.overview.organization')}
          </h2>
          <Link href="/select-org" className="text-sm font-medium text-lime-deep hover:underline">
            {t(locale, 'account.overview.switch')}
          </Link>
        </div>
        <dl className="mt-3 divide-y divide-line">
          <Row label={t(locale, 'account.overview.organization')}>{org?.name}</Row>
          {role && (
            <Row label={t(locale, 'account.overview.role')}>
              <span className="rounded-button bg-ink-950/5 px-2 py-0.5 font-mono text-xs text-ink-950">
                {role}
              </span>
            </Row>
          )}
          <Row label={t(locale, 'account.overview.verification')}>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" aria-hidden />
              {org && t(locale, `account.verification.${org.verificationStatus}`)}
            </span>
          </Row>
          {org?.taxExempt && (
            <Row label={t(locale, 'account.overview.taxExempt')}>
              <span className="rounded-button bg-accent/15 px-2 py-0.5 text-xs font-medium text-lime-deep">
                ✓
              </span>
            </Row>
          )}
          <Row label={t(locale, 'account.overview.paymentTerms')}>
            <span className="font-mono text-xs">{org?.paymentTerms}</span>
          </Row>
          <Row label={t(locale, 'account.overview.credit')}>
            <span className="font-mono tabular-nums">
              {org?.creditLimit
                ? formatMoney(org.creditLimit, currency)
                : t(locale, 'account.overview.notSet')}
            </span>
          </Row>
        </dl>
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {t(locale, 'account.overview.quickAccess')}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-card border border-line px-4 py-3 text-sm font-medium text-ink-950 transition-colors hover:border-accent hover:bg-accent/5"
            >
              {link.label}
              <span aria-hidden className="text-ink-300">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
