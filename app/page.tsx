import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { auth } from '@/lib/auth/config'
import { getLocale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale({ userId: null })
  return {
    title: `${getStoreConfig().identity.name} — ${t(locale, 'landing.tagline')}`,
    description: t(locale, 'landing.metaDescription'),
  }
}

/**
 * Landing pública (Onboarding B2B 2026-06-02). Reemplaza la home-storefront
 * anterior — el catálogo y el contenido AI quedan accesibles vía /catalog y
 * /products/[slug] (públicos para SEO), pero esta home es la puerta de
 * entrada para negocios nuevos.
 */
export default async function LandingPage() {
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto pl-2 pr-6 h-20 flex items-center justify-between">
          <Link href="/" aria-label={getStoreConfig().identity.name} className="-my-2 block shrink-0">
            <Image
              src={getStoreConfig().identity.logo}
              alt={getStoreConfig().identity.name}
              width={1600}
              height={998}
              priority
              className="h-16 md:h-20 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/catalog" className="text-gray-700 hover:text-gray-900">
              {t(locale, 'landing.nav.catalog')}
            </Link>
            {session?.user ? (
              <>
                <Link href="/orders" className="text-gray-700 hover:text-gray-900">
                  {t(locale, 'landing.nav.myAccount')}
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="text-gray-700 hover:text-gray-900">
                  {t(locale, 'landing.nav.signIn')}
                </Link>
                <Link
                  href="/onboarding"
                  className="rounded-md bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-800"
                >
                  {t(locale, 'landing.nav.register')}
                </Link>
              </>
            )}
            <LocaleSwitch current={locale} />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <Image
            src={getStoreConfig().identity.logo}
            alt={getStoreConfig().identity.name}
            width={1600}
            height={998}
            priority
            className="h-24 md:h-32 w-auto mx-auto"
          />
          <p className="mt-6 text-xl md:text-2xl text-gray-700">{t(locale, 'landing.tagline')}</p>
          <div
            aria-hidden
            className="mt-6 mx-auto h-1 w-24 rounded-full"
            style={{ background: 'var(--color-accent)' }}
          />
          <p className="mt-8 max-w-2xl mx-auto text-base md:text-lg text-gray-600">
            {t(locale, 'landing.intro')}
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            {!session?.user && (
              <Link
                href="/onboarding"
                className="rounded-md bg-gray-900 text-white px-6 py-3 text-base font-medium hover:bg-gray-800"
              >
                {t(locale, 'landing.cta.register')}
              </Link>
            )}
            <Link
              href="/catalog"
              className="rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-800 hover:bg-gray-50"
            >
              {t(locale, 'landing.cta.exploreCatalog')}
            </Link>
            {!session?.user && (
              <Link
                href="/sign-in"
                className="text-base font-medium text-gray-700 hover:text-gray-900 underline"
              >
                {t(locale, 'landing.cta.signInExisting')}
              </Link>
            )}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-medium text-gray-900 text-center">
              {t(locale, 'landing.howItWorks.title')}
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3 text-sm text-gray-700">
              <li className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-900 text-white font-medium flex items-center justify-center">
                  1
                </div>
                <h3 className="mt-3 font-medium text-gray-900">
                  {t(locale, 'landing.howItWorks.step1.title')}
                </h3>
                <p className="mt-2 text-gray-600">{t(locale, 'landing.howItWorks.step1.body')}</p>
              </li>
              <li className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-900 text-white font-medium flex items-center justify-center">
                  2
                </div>
                <h3 className="mt-3 font-medium text-gray-900">
                  {t(locale, 'landing.howItWorks.step2.title')}
                </h3>
                <p className="mt-2 text-gray-600">{t(locale, 'landing.howItWorks.step2.body')}</p>
              </li>
              <li className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-900 text-white font-medium flex items-center justify-center">
                  3
                </div>
                <h3 className="mt-3 font-medium text-gray-900">
                  {t(locale, 'landing.howItWorks.step3.title')}
                </h3>
                <p className="mt-2 text-gray-600">{t(locale, 'landing.howItWorks.step3.body')}</p>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-gray-500 flex flex-wrap gap-4 justify-between">
          <span>
            © {new Date().getFullYear()} {getStoreConfig().identity.name}
          </span>
          <div className="flex gap-4">
            <Link href="/catalog" className="hover:text-gray-700">
              {t(locale, 'landing.nav.catalog')}
            </Link>
            {!session?.user && (
              <Link href="/onboarding" className="hover:text-gray-700">
                {t(locale, 'landing.cta.register')}
              </Link>
            )}
            {session?.user ? (
              <SignOutButton
                label={t(locale, 'landing.footer.signOut')}
                className="hover:text-gray-700"
              />
            ) : (
              <Link href="/sign-in" className="hover:text-gray-700">
                {t(locale, 'landing.nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
