import { Header } from '@/components/commerce/Header'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { HeroBattery } from '@/components/home/HeroBattery'
import { HomeMotion } from '@/components/home/HomeMotion'
import { IconFileUpload, IconShieldCheck, IconShoppingCart } from '@/components/home/StepIcons'
import { auth } from '@/lib/auth/config'
import { getLocale, t } from '@/lib/i18n'
import { getStoreConfig } from '@/stores'
import type { Metadata } from 'next'
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

      <Header isSignedIn={Boolean(session?.user)} locale={locale} initialTheme="dark" />

      <main className="flex-1">
        {/* Hero — dark tile with stylized battery + headline + CTAs */}
        <section
          aria-labelledby="hero-tagline"
          className="-mt-20 bg-neutral-900 text-surface"
          data-motion="hero"
          data-header-theme="dark"
        >
          <div className="mx-auto max-w-[1240px] px-5 md:px-8 py-20 md:py-28">
            <div className="grid items-center gap-14 md:grid-cols-[1.1fr,1fr] md:gap-16">
              {/* Text (DOM-first for SEO + a11y; visually on the right at md). */}
              <div className="text-center md:order-2 md:text-left">
                <h1
                  id="hero-tagline"
                  className="font-sans text-display font-semibold tracking-[-0.025em] text-surface text-balance"
                  data-motion-step="1"
                >
                  {t(locale, 'landing.tagline')}
                </h1>
                <div
                  aria-hidden
                  className="mt-7 mx-auto h-px w-24 bg-accent md:mx-0"
                  data-motion-step="2"
                />
                <p
                  className="mt-8 mx-auto max-w-2xl text-body-lg text-surface/70 text-pretty md:mx-0"
                  data-motion-step="3"
                >
                  {t(locale, 'landing.intro')}
                </p>
                <div
                  className="mt-12 flex flex-wrap items-center justify-center gap-3 md:justify-start"
                  data-motion-step="4"
                >
                  {!session?.user && (
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center justify-center rounded-button bg-accent text-ink-950 px-6 py-3 text-base font-semibold hover:-translate-y-px transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                    >
                      {t(locale, 'landing.cta.register')}
                    </Link>
                  )}
                  <Link
                    href="/catalog"
                    className="inline-flex items-center justify-center rounded-button border-[1.5px] border-accent bg-transparent text-surface px-6 py-3 text-base font-medium hover:bg-accent hover:text-ink-950 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  >
                    {t(locale, 'landing.cta.exploreCatalog')}
                  </Link>
                  {!session?.user && (
                    <Link
                      href="/sign-in"
                      className="text-base font-medium text-surface/85 hover:text-surface underline underline-offset-4 decoration-surface/30 hover:decoration-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded"
                    >
                      {t(locale, 'landing.cta.signInExisting')}
                    </Link>
                  )}
                </div>
              </div>
              {/* Battery — decorative; aria-hidden in the component. */}
              <div className="flex justify-center md:order-1 md:justify-start">
                <HeroBattery className="h-auto w-40 md:w-56" />
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          aria-labelledby="how-it-works-title"
          className="border-y border-ink-100 bg-muted"
          data-header-theme="light"
        >
          <div className="mx-auto max-w-5xl px-5 md:px-8 py-20 md:py-24">
            <h2
              id="how-it-works-title"
              className="text-h2 font-semibold tracking-[-0.02em] text-ink-950 text-center text-balance"
            >
              {t(locale, 'landing.howItWorks.title')}
            </h2>
            <div className="relative mt-14" data-motion="steps">
              {/* Connecting journey lines — sit BEHIND the cards (DOM order)
                  so cards' opaque surface clips them: the line is visible only
                  in the gaps between steps, reading as a connecting path.
                  HomeMotion draws each line on ScrollTrigger via scaleX (desktop)
                  or scaleY (mobile). */}
              <div
                aria-hidden
                data-steps-line="horizontal"
                className="pointer-events-none absolute top-[64px] left-7 right-7 hidden h-px origin-left bg-accent md:block"
              />
              <div
                aria-hidden
                data-steps-line="vertical"
                className="pointer-events-none absolute left-[40px] top-7 bottom-7 block w-px origin-top bg-accent md:hidden"
              />
              <ol className="relative grid gap-6 md:grid-cols-3">
                {(
                  [
                    { key: 'step1', Icon: IconFileUpload },
                    { key: 'step2', Icon: IconShieldCheck },
                    { key: 'step3', Icon: IconShoppingCart },
                  ] as const
                ).map(({ key, Icon }, i) => (
                  <li
                    key={key}
                    className="group relative rounded-card bg-surface ring-1 ring-ink-100 px-7 py-8 transition-[transform,box-shadow,outline-color] duration-200 ease-out hover:-translate-y-1 hover:ring-ink-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    data-motion-item
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-[22px] w-[22px] shrink-0 text-ink-500 transition-colors duration-200 group-hover:text-accent" />
                      <span className="font-mono text-meta tracking-widest uppercase text-ink-500 transition-colors duration-200 group-hover:text-ink-700">
                        {t(locale, 'landing.howItWorks.stepLabel')}
                      </span>
                      <span className="font-mono text-meta font-semibold text-ink-950">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-4 text-h3 font-semibold tracking-[-0.01em] text-ink-950">
                      {t(locale, `landing.howItWorks.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-body text-ink-700 text-pretty">
                      {t(locale, `landing.howItWorks.${key}.body`)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 bg-surface" data-header-theme="light">
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
