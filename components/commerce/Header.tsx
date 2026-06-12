import { HeaderThemeWatcher } from '@/components/commerce/HeaderThemeWatcher'
import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/messages'
import { getStoreConfig } from '@/stores'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  isSignedIn: boolean
  locale: Locale
  /**
   * First-paint theme (SSR). HeaderThemeWatcher then flips this on scroll
   * based on the `data-header-theme` attribute of whatever section is
   * directly under the bar. Pages with no such sections keep this value.
   */
  initialTheme?: 'dark' | 'light'
}

/**
 * Sticky header. Transparent over dark sections, semi-transparent surface
 * over light sections; logo + link colours crossfade between the two.
 * Theme is encoded as `data-header-theme="dark" | "light"` on the <header>
 * element and toggled by HeaderThemeWatcher in response to scroll. All the
 * styling switches live as Tailwind `data-[...]:` / `group-data-[...]:`
 * variants so the React tree never re-renders on scroll.
 *
 * WCAG: in BOTH states the logo, nav links, Register CTA, and locale
 * selector hit AA against their background. Register stays lime + slate
 * across themes (AAA on lime, AAA on dark, AAA on surface).
 */
export function Header({ isSignedIn, locale, initialTheme = 'light' }: Props) {
  const store = getStoreConfig()
  const logoLightSrc = store.identity.logoLight ?? store.identity.logo

  const barCls = [
    'group/header sticky top-0 z-sticky border-b backdrop-blur',
    'transition-[background-color,border-color] duration-300 ease-out motion-reduce:duration-0',
    'data-[header-theme=dark]:bg-transparent data-[header-theme=dark]:border-transparent',
    'data-[header-theme=light]:bg-surface/85 data-[header-theme=light]:supports-[backdrop-filter]:bg-surface/70 data-[header-theme=light]:border-ink-100',
  ].join(' ')

  const linkCls = [
    'rounded transition-colors duration-300 ease-out motion-reduce:duration-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    'group-data-[header-theme=dark]/header:text-surface/85 group-data-[header-theme=dark]/header:hover:text-surface group-data-[header-theme=dark]/header:focus-visible:ring-offset-transparent',
    'group-data-[header-theme=light]/header:text-ink-700 group-data-[header-theme=light]/header:hover:text-ink-950 group-data-[header-theme=light]/header:focus-visible:ring-offset-surface',
  ].join(' ')

  // Register CTA — lime fill + slate text in BOTH themes per brief.
  const ctaCls = [
    'inline-flex items-center rounded-button bg-accent text-ink-950 px-4 py-2 font-semibold',
    'transition-all duration-150 hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    'group-data-[header-theme=dark]/header:focus-visible:ring-offset-transparent',
    'group-data-[header-theme=light]/header:focus-visible:ring-offset-surface',
  ].join(' ')

  const logoCrossfade =
    'h-14 md:h-16 w-auto transition-opacity duration-300 ease-out motion-reduce:duration-0'

  return (
    <header className={barCls} data-header-theme={initialTheme}>
      <HeaderThemeWatcher />
      <div className="mx-auto max-w-[1240px] px-5 md:px-8 h-20 flex items-center justify-between">
        <Link
          href="/"
          aria-label={store.identity.name}
          className="-my-2 block shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {/* Crossfade: both logos stacked via CSS grid, opacity driven by the
              parent header's data-header-theme. Both images share intrinsic
              dimensions so neither causes layout shift on swap. */}
          <span className="grid h-14 md:h-16 w-auto">
            <Image
              src={store.identity.logo}
              alt={store.identity.name}
              width={1600}
              height={998}
              priority
              style={{ gridArea: '1 / 1' }}
              className={`${logoCrossfade} group-data-[header-theme=dark]/header:opacity-0 group-data-[header-theme=light]/header:opacity-100`}
            />
            <Image
              src={logoLightSrc}
              alt=""
              aria-hidden="true"
              width={1600}
              height={998}
              priority
              style={{ gridArea: '1 / 1' }}
              className={`${logoCrossfade} group-data-[header-theme=dark]/header:opacity-100 group-data-[header-theme=light]/header:opacity-0`}
            />
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-small">
          <Link href="/catalog" className={linkCls}>
            {t(locale, 'landing.nav.catalog')}
          </Link>
          {isSignedIn ? (
            <>
              <Link href="/orders" className={linkCls}>
                {t(locale, 'landing.nav.myAccount')}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className={linkCls}>
                {t(locale, 'landing.nav.signIn')}
              </Link>
              <Link href="/sign-up" className={ctaCls}>
                {t(locale, 'landing.nav.register')}
              </Link>
            </>
          )}
          <LocaleSwitch current={locale} />
        </nav>
      </div>
    </header>
  )
}
