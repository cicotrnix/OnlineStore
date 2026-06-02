import { ChatWidget } from '@/components/commerce/ChatWidget'
import { ImpersonationBanner } from '@/components/commerce/ImpersonationBanner'
import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { NotificationBadge } from '@/components/commerce/NotificationBadge'
import { SearchBar } from '@/components/commerce/SearchBar'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { auth } from '@/lib/auth/config'
import { maintainCurrentSession } from '@/lib/auth/maintain'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { getLocale, t } from '@/lib/i18n'
import { cartService } from '@/modules/cart'
import storeConfig from '@/store.config'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await maintainCurrentSession()
  const session = await auth()
  const userId = session?.user?.id
  const cart = userId ? await cartService.get(userId) : null
  const cartCount = cart?.items.reduce((acc, i) => acc + i.quantity, 0) ?? 0
  const locale = await getLocale({ userId: userId ?? null })

  let impersonatingName: string | null = null
  if (session?.impersonatingOrgId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.impersonatingOrgId },
      select: { name: true },
    })
    impersonatingName = org?.name ?? null
  }

  const showQuotes = isFeatureEnabled('rfq') && Boolean(userId)
  const showInvoices = isFeatureEnabled('credit') && Boolean(userId)
  const showApprovals = isFeatureEnabled('approvals') && Boolean(userId)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {impersonatingName && <ImpersonationBanner orgName={impersonatingName} />}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto pl-2 pr-6 h-20 flex items-center justify-between">
          <Link href="/" aria-label={storeConfig.identity.name} className="-my-2 block shrink-0">
            <Image
              src={storeConfig.identity.logo}
              alt={storeConfig.identity.name}
              width={1600}
              height={998}
              priority
              className="h-16 md:h-20 w-auto"
            />
          </Link>
          <div className="hidden md:block flex-1 mx-6 max-w-md">
            <SearchBar />
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/catalog" className="text-gray-700 hover:text-gray-900">
              {t(locale, 'storefront.nav.catalog')}
            </Link>
            {showQuotes && (
              <Link href="/quotes" className="text-gray-700 hover:text-gray-900">
                {t(locale, 'storefront.nav.quotes')}
              </Link>
            )}
            <Link href="/cart" className="text-gray-700 hover:text-gray-900 relative">
              {t(locale, 'storefront.nav.cart')}
              {cartCount > 0 && (
                <span
                  className="absolute -top-2 -right-4 text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {cartCount}
                </span>
              )}
            </Link>
            {userId && (
              <Link href="/orders" className="text-gray-700 hover:text-gray-900">
                {t(locale, 'storefront.nav.orders')}
              </Link>
            )}
            {showInvoices && (
              <Link href="/invoices" className="text-gray-700 hover:text-gray-900">
                {t(locale, 'storefront.nav.invoices')}
              </Link>
            )}
            {showApprovals && (
              <Link href="/approvals" className="text-gray-700 hover:text-gray-900">
                {t(locale, 'storefront.nav.approvals')}
              </Link>
            )}
            <LocaleSwitch current={locale} />
            {userId ? (
              <>
                <NotificationBadge />
                <SignOutButton />
              </>
            ) : (
              <Link href="/sign-in" className="text-gray-700 hover:text-gray-900">
                {t(locale, 'storefront.nav.signIn')}
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-gray-500">
          © {new Date().getFullYear()} {storeConfig.identity.name}
        </div>
      </footer>
      {storeConfig.ai.chat && <ChatWidget />}
    </div>
  )
}
