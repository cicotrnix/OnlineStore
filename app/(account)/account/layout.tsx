import { requireVerifiedCustomer } from '@/lib/auth/customer'
import { getLocale, t } from '@/lib/i18n'
import { AccountSubNav } from './AccountSubNav'

export const dynamic = 'force-dynamic'

/**
 * Shell del hub de cuenta (Overview · Profile · Addresses · Security). Vive bajo
 * el header inner unificado (lo provee el layout de (account)). Las órdenes NO
 * cuelgan de este shell — tienen su propio flujo, solo se enlazan.
 */
export default async function AccountSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const state = await requireVerifiedCustomer()
  const locale = await getLocale({ userId: state.userId })

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">
        {t(locale, 'account.title')}
      </h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <aside className="lg:pt-1">
          <AccountSubNav locale={locale} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
