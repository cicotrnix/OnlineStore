import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { HomeMotion } from '@/components/home/HomeMotion'
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

export default async function LandingPage() {
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })
  const store = getStoreConfig()

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink-700">
      <HomeMotion />

      <header className="sticky top-0 z-sticky bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70 border-b border-ink-100">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8 h-20 flex items-center justify-between">
          <Link
            href="/"
            aria-label={store.identity.name}
            className="-my-2 block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
          >
            <Image
              src={store.identity.logo}
              alt={store.identity.name}
              width={1600}
              height={998}
              priority
              className="h-14 md:h-16 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-6 text-small">
            <Link
              href="/catalog"
              className="text-ink-700 hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
            >
              {t(locale, 'landing.nav.catalog')}
            </Link>
            {session?.user ? (
              <>
                <Link
                  href="/orders"
                  className="text-ink-700 hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
                >
                  {t(locale, 'landing.nav.myAccount')}
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-ink-700 hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
                >
                  {t(locale, 'landing.nav.signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center rounded-button bg-ink-950 text-surface px-4 py-2 font-medium hover:-translate-y-px hover:ring-2 hover:ring-accent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
        <section
          aria-labelledby="hero-tagline"
          className="mx-auto max-w-5xl px-5 md:px-8 pt-20 md:pt-28 pb-20 md:pb-28 text-center"
          data-motion="hero"
        >
          <Image
            src={store.identity.logo}
            alt={store.identity.name}
            width={1600}
            height={998}
            priority
            className="h-20 md:h-28 w-auto mx-auto"
            data-motion-step="1"
          />
          <h1
            id="hero-tagline"
            className="mt-8 font-sans text-display font-semibold tracking-[-0.025em] text-ink-950 text-balance"
            data-motion-step="2"
          >
            {t(locale, 'landing.tagline')}
          </h1>
          <div aria-hidden className="mt-7 mx-auto h-px w-24 bg-accent" data-motion-step="3" />
          <p
            className="mt-8 mx-auto max-w-2xl text-body-lg text-ink-500 text-pretty"
            data-motion-step="4"
          >
            {t(locale, 'landing.intro')}
          </p>

          <div
            className="mt-12 flex items-center justify-center gap-3 flex-wrap"
            data-motion-step="5"
          >
            {!session?.user && (
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-button bg-ink-950 text-surface px-6 py-3 text-base font-medium hover:-translate-y-px hover:ring-2 hover:ring-accent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t(locale, 'landing.cta.register')}
              </Link>
            )}
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-button border-[1.5px] border-accent bg-surface text-ink-950 px-6 py-3 text-base font-medium hover:bg-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t(locale, 'landing.cta.exploreCatalog')}
            </Link>
            {!session?.user && (
              <Link
                href="/sign-in"
                className="text-base font-medium text-ink-700 hover:text-ink-950 underline underline-offset-4 decoration-ink-300 hover:decoration-ink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
              >
                {t(locale, 'landing.cta.signInExisting')}
              </Link>
            )}
          </div>
        </section>

        {/* Cómo funciona */}
        <section aria-labelledby="how-it-works-title" className="border-y border-ink-100 bg-muted">
          <div className="mx-auto max-w-5xl px-5 md:px-8 py-20 md:py-24">
            <h2
              id="how-it-works-title"
              className="text-h2 font-semibold tracking-[-0.02em] text-ink-950 text-center text-balance"
            >
              {t(locale, 'landing.howItWorks.title')}
            </h2>
            <ol className="mt-14 grid gap-6 md:grid-cols-3" data-motion="steps">
              {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                <li
                  key={step}
                  className="rounded-card bg-surface ring-1 ring-ink-100 px-7 py-8"
                  data-motion-item
                >
                  <div className="flex items-baseline gap-3 text-ink-500">
                    <span className="font-mono text-meta tracking-widest uppercase">
                      {t(locale, 'landing.howItWorks.stepLabel')}
                    </span>
                    <span className="font-mono text-meta text-ink-950 font-semibold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-4 text-h3 font-semibold text-ink-950 tracking-[-0.01em]">
                    {t(locale, `landing.howItWorks.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-body text-ink-700 text-pretty">
                    {t(locale, `landing.howItWorks.${step}.body`)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 md:px-8 py-6 text-meta text-ink-500 flex flex-wrap gap-4 justify-between">
          <span>
            © {new Date().getFullYear()} {store.identity.name}
          </span>
          <div className="flex gap-5">
            <Link
              href="/catalog"
              className="hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
            >
              {t(locale, 'landing.nav.catalog')}
            </Link>
            {!session?.user && (
              <Link
                href="/sign-up"
                className="hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
              >
                {t(locale, 'landing.cta.register')}
              </Link>
            )}
            {session?.user ? (
              <SignOutButton
                label={t(locale, 'landing.footer.signOut')}
                className="hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
              />
            ) : (
              <Link
                href="/sign-in"
                className="hover:text-ink-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
              >
                {t(locale, 'landing.nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
