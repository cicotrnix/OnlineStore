import { ChatWidget } from '@/components/commerce/ChatWidget'
import { HeaderContainer } from '@/components/commerce/HeaderContainer'
import { auth } from '@/lib/auth/config'
import { getCustomerState } from '@/lib/auth/customer'
import { maintainCurrentSession } from '@/lib/auth/maintain'
import { getLocale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await maintainCurrentSession()
  // User logueado sin organizaciones → onboarding. Anónimos siguen navegando
  // el catálogo público (ADR 0034). /onboarding está fuera de (storefront),
  // así que no hay loop.
  const customer = await getCustomerState()
  if (customer.kind === 'no-org') {
    redirect('/onboarding')
  }
  const storeConfig = getStoreConfig()
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })

  const legalLinks = [
    { href: '/legal/terms', key: 'footer.terms' as const },
    { href: '/legal/privacy', key: 'footer.privacy' as const },
    { href: '/legal/returns', key: 'footer.returns' as const },
    { href: '/legal/shipping', key: 'footer.shipping' as const },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderContainer variant="inner" />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <nav aria-label={t(locale, 'footer.legalHeading')}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-500 hover:text-gray-900">
                    {t(locale, link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-4 max-w-2xl text-xs text-gray-400">
            {t(locale, 'footer.brandDisclaimer')}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            © {new Date().getFullYear()} {storeConfig.identity.name}
          </p>
        </div>
      </footer>
      {storeConfig.ai.chat && <ChatWidget />}
    </div>
  )
}
