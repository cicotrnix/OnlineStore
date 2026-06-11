import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/messages'
import { getStoreConfig } from '@/stores'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  /** Whether the user is signed in. We only need a boolean here, not the full session. */
  isSignedIn: boolean
  locale: Locale
  /**
   * Render the header in dark mode (logoLight, white nav text, dark bar) for
   * surfaces that sit directly over a dark hero. Off by default so reusing
   * this header on light pages keeps the regular dark logo and slate text.
   */
  onDark?: boolean
}

/**
 * Header — shared sticky top bar. Drives the logo variant + colour palette
 * via `onDark`. Falls back to the regular logo when a store doesn't define
 * `logoLight`, so multi-store deployments stay safe.
 */
export function Header({ isSignedIn, locale, onDark = false }: Props) {
  const store = getStoreConfig()
  const logoSrc = onDark ? (store.identity.logoLight ?? store.identity.logo) : store.identity.logo

  const barCls = onDark
    ? 'sticky top-0 z-sticky bg-neutral-900'
    : 'sticky top-0 z-sticky bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70 border-b border-ink-100'
  const linkCls = onDark
    ? 'text-surface/80 transition-colors hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded'
    : 'text-ink-700 transition-colors hover:text-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded'
  const ctaCls = onDark
    ? 'inline-flex items-center rounded-button bg-accent text-ink-950 px-4 py-2 font-semibold transition-all duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900'
    : 'inline-flex items-center rounded-button bg-ink-950 text-surface px-4 py-2 font-medium transition-all duration-150 hover:-translate-y-px hover:ring-2 hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

  return (
    <header className={barCls}>
      <div className="mx-auto max-w-[1240px] px-5 md:px-8 h-20 flex items-center justify-between">
        <Link
          href="/"
          aria-label={store.identity.name}
          className="-my-2 block shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Image
            src={logoSrc}
            alt={store.identity.name}
            width={1600}
            height={998}
            priority
            className="h-14 md:h-16 w-auto"
          />
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
