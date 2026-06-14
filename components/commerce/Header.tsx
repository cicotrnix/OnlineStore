import { AccountMenu } from '@/components/commerce/AccountMenu'
import { HeaderThemeWatcher } from '@/components/commerce/HeaderThemeWatcher'
import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { MobileNav } from '@/components/commerce/MobileNav'
import { NotificationBadge } from '@/components/commerce/NotificationBadge'
import { SearchBar } from '@/components/commerce/SearchBar'
import { SignOutButton } from '@/components/commerce/SignOutButton'
import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/messages'
import { getStoreConfig } from '@/stores'
import Image from 'next/image'
import Link from 'next/link'

export interface HeaderProps {
  variant: 'home' | 'inner'
  locale: Locale
  isSignedIn: boolean
  /** First-paint theme (SSR), solo se usa en variant='home'. */
  initialTheme?: 'dark' | 'light'
  cartCount: number
  /** Reservado (NotificationBadge se auto-fetchea hoy). */
  notificationCount?: number
  flags: { rfq: boolean; credit: boolean; approvals: boolean }
}

/**
 * Header único del chrome "Back to 100%" (storefront + account + home).
 *
 * - variant='home': barra transparente sobre el hero oscuro con crossfade
 *   dark↔light en scroll (monta HeaderThemeWatcher). Sin búsqueda.
 * - variant='inner': barra SÓLIDA clara fija (sin watcher, sin transparencia —
 *   no hay hero debajo). Con búsqueda inline.
 *
 * Presentacional puro: sin DB ni auth(); todo por props (las resuelve
 * HeaderContainer). El tree no re-renderiza en scroll (las variantes de tema
 * son `data-[...]:` de Tailwind, no estado de React).
 *
 * WCAG: logo, links, Register CTA, locale y campana pasan AA en ambos temas.
 */
export function Header({
  variant,
  locale,
  isSignedIn,
  initialTheme = 'light',
  cartCount,
  flags,
}: HeaderProps) {
  const store = getStoreConfig()
  const logoLightSrc = store.identity.logoLight ?? store.identity.logo
  const isHome = variant === 'home'

  const barCls = isHome
    ? [
        'group/header sticky top-0 z-sticky border-b backdrop-blur',
        'transition-[background-color,border-color] duration-300 ease-out motion-reduce:duration-0',
        'data-[header-theme=dark]:bg-transparent data-[header-theme=dark]:border-transparent',
        'data-[header-theme=light]:bg-surface/85 data-[header-theme=light]:supports-[backdrop-filter]:bg-surface/70 data-[header-theme=light]:border-ink-100',
      ].join(' ')
    : 'group/header sticky top-0 z-sticky border-b bg-surface border-ink-100'

  // Links: las variantes light de los data-attrs aplican en ambos casos (inner
  // queda fijo en data-header-theme=light).
  const linkCls = [
    'rounded transition-colors duration-300 ease-out motion-reduce:duration-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    'group-data-[header-theme=dark]/header:text-surface/85 group-data-[header-theme=dark]/header:hover:text-surface group-data-[header-theme=dark]/header:focus-visible:ring-offset-transparent',
    'group-data-[header-theme=light]/header:text-ink-700 group-data-[header-theme=light]/header:hover:text-ink-950 group-data-[header-theme=light]/header:focus-visible:ring-offset-surface',
  ].join(' ')

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
    <header className={barCls} data-header-theme={isHome ? initialTheme : 'light'}>
      {isHome && <HeaderThemeWatcher />}
      <div className="mx-auto max-w-[1240px] px-5 md:px-8 h-20 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label={store.identity.name}
          className="-my-2 block shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
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

        {/* Búsqueda inline — solo en páginas internas. */}
        {!isHome && (
          <div className="hidden md:block flex-1 max-w-md" data-testid="header-search">
            <SearchBar placeholder={t(locale, 'header.searchPlaceholder')} />
          </div>
        )}

        <nav className="hidden md:flex items-center gap-5 text-small">
          <Link href="/catalog" className={linkCls}>
            {t(locale, 'header.catalog')}
          </Link>

          {isSignedIn ? (
            <>
              <Link
                href="/cart"
                className={`relative ${linkCls}`}
                aria-label={t(locale, 'header.cartItems', { count: cartCount })}
              >
                {t(locale, 'header.cart')}
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-4 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-ink-950">
                    {cartCount}
                  </span>
                )}
              </Link>
              {/* Ítems de cuenta (Orders/Buy again/Quotes/Invoices/Approvals/Sign
                  out) colapsados en el dropdown para no recargar el chrome. */}
              <AccountMenu
                locale={locale}
                flags={flags}
                triggerClassName={linkCls}
                signOut={
                  <SignOutButton
                    label={t(locale, 'header.signOut')}
                    className="block w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                  />
                }
              />
              <NotificationBadge />
            </>
          ) : (
            <>
              <Link href="/sign-in" className={linkCls}>
                {t(locale, 'header.signIn')}
              </Link>
              <Link href="/sign-up" className={ctaCls}>
                {t(locale, 'header.register')}
              </Link>
            </>
          )}

          <LocaleSwitch current={locale} />
        </nav>

        {/* Mobile: logo · carrito · hamburguesa. El nav vive en el drawer. */}
        <div className="flex items-center gap-1 md:hidden">
          {isSignedIn && (
            <Link
              href="/cart"
              className={`relative ${linkCls} px-2`}
              aria-label={t(locale, 'header.cartItems', { count: cartCount })}
            >
              {t(locale, 'header.cart')}
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-ink-950">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          <MobileNav
            locale={locale}
            isSignedIn={isSignedIn}
            flags={flags}
            signOut={
              <SignOutButton
                label={t(locale, 'header.signOut')}
                className="block w-full px-2 py-2 text-left text-base text-ink-700 hover:bg-ink-50"
              />
            }
            notifications={<NotificationBadge />}
          />
        </div>
      </div>

      {/* Páginas internas: búsqueda full-width bajo la barra en mobile. */}
      {!isHome && (
        <div className="border-t border-ink-100 px-5 py-2 md:hidden">
          <SearchBar placeholder={t(locale, 'header.searchPlaceholder')} />
        </div>
      )}
    </header>
  )
}
