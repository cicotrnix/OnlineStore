import { HERO_STATS } from '@/app/_home-stats'
import { Header } from '@/components/commerce/Header'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { SpecReadout, type SpecRow } from '@/components/commerce/SpecReadout'
import { StatStrip } from '@/components/commerce/StatStrip'
import { HeroGauge } from '@/components/home/HeroGauge'
import { HomeMotion } from '@/components/home/HomeMotion'
import { IconFileUpload, IconShieldCheck, IconShoppingCart } from '@/components/home/StepIcons'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { filterForOrg } from '@/modules/catalog'
import { getStoreConfig } from '@/stores'
import type { Category, Product } from '@prisma/client'
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

  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const rawProducts = await prisma.product.findMany({
    where: { isActive: true, isPrivate: false, category: { isPrivate: false } },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })
  const visibleProducts = orgId
    ? await filterForOrg(orgId, rawProducts as (Product & { category: Category })[])
    : rawProducts
  const featuredProducts = visibleProducts.slice(0, 4)

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink-700">
      <HomeMotion />

      <Header isSignedIn={Boolean(session?.user)} locale={locale} initialTheme="dark" />

      <main className="flex-1">
        {/* Hero — dark canvas. "Volvé al 100%. Cero ciclos." */}
        <section
          aria-labelledby="hero-tagline"
          className="-mt-20 relative overflow-hidden bg-neutral-900 text-surface"
          data-motion="hero"
          data-header-theme="dark"
        >
          {/* Lime glow accent behind the gauge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(80% 60% at 78% 18%, rgba(136,216,16,0.10), transparent 60%)',
            }}
          />
          <div className="relative mx-auto max-w-[1240px] px-5 md:px-8 pt-[140px] md:pt-[160px] pb-20 md:pb-24">
            <div className="grid items-center gap-14 md:grid-cols-[0.85fr,1.15fr] md:gap-16">
              {/* Text — DOM-first for SEO + a11y; visually left at md (gauge on right). */}
              <div className="text-center md:text-left">
                {/* Eyebrow chip */}
                <span
                  className="mb-7 inline-flex items-center gap-[9px] rounded-button border border-accent/30 bg-accent/[0.06] px-[14px] py-[7px] font-mono text-[12px] uppercase tracking-[0.08em] text-accent"
                  data-motion-step="1"
                >
                  <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-accent" />
                  {t(locale, 'landing.hero.eyebrow')}
                </span>
                <h1
                  id="hero-tagline"
                  className="font-sans text-display font-extrabold leading-[0.98] tracking-[-0.045em] text-surface text-balance"
                  data-motion-step="2"
                >
                  {t(locale, 'landing.hero.headlineMain')}{' '}
                  <span className="text-accent">{t(locale, 'landing.hero.headlineAccent')}</span>
                  {t(locale, 'landing.hero.headlineTail')}
                </h1>
                <p
                  className="mt-[26px] mx-auto max-w-[46ch] text-body-lg leading-[1.55] text-on-dark-2 text-pretty md:mx-0"
                  data-motion-step="3"
                >
                  {t(locale, 'landing.hero.lead')}
                </p>
                <div
                  className="mt-[38px] flex flex-wrap items-center justify-center gap-[14px] md:justify-start"
                  data-motion-step="4"
                >
                  {!session?.user && (
                    <Link
                      href="/sign-up"
                      className="inline-flex h-11 items-center rounded-button bg-accent text-ink-950 px-[22px] text-[14.5px] font-semibold tracking-[-0.01em] shadow-[0_6px_22px_-8px_rgba(136,216,16,0.6)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_30px_-8px_rgba(136,216,16,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                    >
                      {t(locale, 'landing.cta.register')}
                    </Link>
                  )}
                  <Link
                    href="/catalog"
                    className="inline-flex h-11 items-center rounded-button border border-white/[0.22] bg-transparent text-surface px-[22px] text-[14.5px] font-semibold tracking-[-0.01em] transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  >
                    {t(locale, 'landing.cta.exploreCatalog')} →
                  </Link>
                </div>
              </div>
              {/* Gauge — decorative; aria-hidden in the component. */}
              <div className="flex justify-center md:justify-end">
                <HeroGauge locale={locale} />
              </div>
            </div>
          </div>
        </section>

        {/* Stat strip — instrument-grade tira sobre slate-deep. Stats en
            app/_home-stats.ts: solo claims verificables (regla "nunca inventar"). */}
        <StatStrip locale={locale} stats={HERO_STATS} />

        {/* Featured products */}
        {featuredProducts.length > 0 && (
          <section
            aria-labelledby="featured-title"
            className="bg-surface"
            data-header-theme="light"
          >
            <div className="mx-auto max-w-[1240px] px-5 md:px-8 py-20 md:py-24">
              <div className="mb-10 flex items-end justify-between gap-6" data-reveal>
                <div>
                  <div className="mb-3 font-mono text-[12.5px] uppercase tracking-[0.1em] text-lime-deep">
                    {t(locale, 'landing.featured.eyebrow')}
                  </div>
                  <h2
                    id="featured-title"
                    className="text-h2 font-extrabold leading-[1.02] tracking-[-0.035em] text-ink-950"
                  >
                    {t(locale, 'landing.featured.title')}
                  </h2>
                </div>
                <Link
                  href="/catalog"
                  className="border-b-2 border-accent pb-[2px] text-[14.5px] font-semibold text-ink-950 transition-colors hover:text-lime-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  {t(locale, 'landing.featured.linkAll')}
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {featuredProducts.map((p) => {
                  const attrs = (p.attributes ?? {}) as Record<string, unknown>
                  const capacity = typeof attrs.capacity === 'string' ? attrs.capacity : null
                  const tagOnFlex = attrs.tagOnFlex === true
                  const specRows: SpecRow[] = [
                    { value: '100%', labelKey: 'spec.label.health' },
                    { value: '0', labelKey: 'spec.label.cycles' },
                    ...(capacity
                      ? [
                          {
                            value: capacity,
                            up: true,
                            labelKey: 'spec.label.capacity' as SpecRow['labelKey'],
                          },
                        ]
                      : []),
                  ]
                  return (
                    <Link
                      href={`/products/${p.slug}`}
                      key={p.id}
                      className="group block overflow-hidden rounded-card border border-line bg-surface transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-[5px] hover:border-[#dfe4d9] hover:shadow-[0_26px_50px_-26px_rgba(26,31,46,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      data-reveal
                    >
                      {/* Product image or placeholder */}
                      <div
                        className="relative flex aspect-[4/3.4] items-center justify-center overflow-hidden"
                        style={{
                          background: 'radial-gradient(120% 120% at 50% 24%, #fbfcf9, #eef1e7)',
                        }}
                      >
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          /* Mini battery glyph fallback */
                          <div
                            aria-hidden
                            className="relative h-[112px] w-[66px] rounded-[12px] border-[2.5px] border-[#cfd4c8] bg-surface"
                          >
                            <span
                              aria-hidden
                              className="absolute -top-[7px] left-1/2 h-[6px] w-[24px] -translate-x-1/2 rounded-t-[3px] bg-[#cfd4c8]"
                            />
                            <span
                              aria-hidden
                              className="absolute bottom-2 left-2 right-2 top-[34%] rounded-[6px] bg-accent"
                            />
                          </div>
                        )}
                        {tagOnFlex && (
                          <span className="absolute left-3 top-3 rounded-[7px] bg-accent px-[10px] py-[5px] font-mono text-[11px] font-semibold tracking-[0.04em] text-ink-950">
                            {t(locale, 'landing.featured.tagOnFlex')}
                          </span>
                        )}
                      </div>
                      <div className="px-[18px] pb-[20px] pt-[18px]">
                        <div className="font-mono text-[12px] tracking-[0.02em] text-ink-300">
                          {p.sku}
                        </div>
                        <h3 className="mt-[7px] text-[16px] font-semibold leading-[1.3] tracking-[-0.015em] text-ink-950">
                          {p.name}
                        </h3>
                        <SpecReadout locale={locale} rows={specRows} />
                        <div className="flex items-center justify-between">
                          {session?.user ? (
                            <span className="font-mono text-[19px] font-semibold tracking-[-0.02em] text-ink-950">
                              {formatMoney(p.basePrice, store.currency.base)}
                            </span>
                          ) : (
                            <span className="text-[13px] text-ink-400 italic">
                              {t(locale, 'landing.featured.loginForPrice')}
                            </span>
                          )}
                          <span className="flex h-10 w-10 items-center justify-center rounded-button border border-ink-950 text-ink-950 transition-colors duration-200 group-hover:border-ink-950 group-hover:bg-ink-950 group-hover:text-surface">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* How it works — section-head pattern + journey-connected steps */}
        <section
          aria-labelledby="how-it-works-title"
          className="border-y border-line bg-muted"
          data-header-theme="light"
        >
          <div className="mx-auto max-w-[1240px] px-5 md:px-8 py-20 md:py-24">
            <div className="mb-12 flex items-end justify-between gap-6" data-reveal>
              <div>
                <div className="mb-3 font-mono text-[12.5px] uppercase tracking-[0.1em] text-lime-deep">
                  {t(locale, 'landing.howItWorks.eyebrow')}
                </div>
                <h2
                  id="how-it-works-title"
                  className="text-h2 font-extrabold leading-[1.02] tracking-[-0.035em] text-ink-950 text-balance"
                >
                  {t(locale, 'landing.howItWorks.title')}
                </h2>
              </div>
            </div>
            <div className="relative" data-motion="steps">
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
                    className="group relative rounded-card border border-line bg-surface px-7 py-8 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-ink-100 hover:shadow-[0_20px_40px_-24px_rgba(26,31,46,0.25)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    data-motion-item
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-muted text-ink-950 transition-colors duration-200 group-hover:bg-accent/[0.16] group-hover:text-lime-deep">
                        <Icon className="h-[22px] w-[22px] shrink-0" />
                      </span>
                      <div>
                        <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-500">
                          {t(locale, 'landing.howItWorks.stepLabel')}{' '}
                          <span className="font-semibold text-ink-950">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3 className="mt-5 text-[20px] font-bold tracking-[-0.02em] text-ink-950">
                      {t(locale, `landing.howItWorks.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-[1.55] text-ink-500 text-pretty">
                      {t(locale, `landing.howItWorks.${key}.body`)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface" data-header-theme="light">
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
