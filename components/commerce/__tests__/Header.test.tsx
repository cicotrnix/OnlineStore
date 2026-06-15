import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Header, type HeaderProps } from '../Header'

// Children client/async que usan router/DB → stubs deterministas para SSR.
vi.mock('@/components/commerce/HeaderThemeWatcher', () => ({
  HeaderThemeWatcher: () => <span data-testid="theme-watcher" />,
}))
vi.mock('@/components/commerce/SearchBar', () => ({
  SearchBar: () => <div data-testid="searchbar" />,
}))
vi.mock('@/components/commerce/LocaleSwitch', () => ({ LocaleSwitch: () => <span /> }))
vi.mock('@/components/commerce/NotificationBadge', () => ({ NotificationBadge: () => <span /> }))
vi.mock('@/components/commerce/SignOutButton', () => ({
  SignOutButton: ({ label }: { label?: string }) => <button type="button">{label}</button>,
}))
vi.mock('@/components/commerce/MobileNav', () => ({
  MobileNav: () => <span data-testid="mobile-nav" />,
}))
// MiniCart importa server actions (auth chain) → mock que renderiza el trigger.
vi.mock('@/components/commerce/MiniCart', () => ({
  MiniCart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/commerce/AccountMenu', () => ({
  AccountMenu: (p: { flags: { rfq: boolean; credit: boolean; approvals: boolean } }) => (
    <span
      data-testid="account-menu"
      data-rfq={String(p.flags.rfq)}
      data-credit={String(p.flags.credit)}
      data-approvals={String(p.flags.approvals)}
    />
  ),
}))

const base: HeaderProps = {
  variant: 'inner',
  locale: 'en-US',
  isSignedIn: true,
  cartCount: 0,
  cartEnabled: false,
  flags: { rfq: false, credit: false, approvals: false },
}

const render = (p: Partial<HeaderProps>) => renderToStaticMarkup(<Header {...base} {...p} />)

describe('Header', () => {
  it('variant=inner monta búsqueda; variant=home no', () => {
    expect(render({ variant: 'inner' })).toContain('data-testid="searchbar"')
    expect(render({ variant: 'home', initialTheme: 'dark' })).not.toContain(
      'data-testid="searchbar"'
    )
  })

  it('HeaderThemeWatcher solo en variant=home', () => {
    expect(render({ variant: 'home', initialTheme: 'dark' })).toContain(
      'data-testid="theme-watcher"'
    )
    expect(render({ variant: 'inner' })).not.toContain('data-testid="theme-watcher"')
  })

  it('inner queda fijo en data-header-theme=light; home arranca con initialTheme', () => {
    expect(render({ variant: 'inner' })).toContain('data-header-theme="light"')
    expect(render({ variant: 'home', initialTheme: 'dark' })).toContain('data-header-theme="dark"')
  })

  it('signed-in muestra AccountMenu + cart; anónimo muestra Sign in + Register', () => {
    const signed = render({ isSignedIn: true })
    expect(signed).toContain('data-testid="account-menu"')
    expect(signed).toContain('Cart')
    const anon = render({ isSignedIn: false })
    expect(anon).toContain('Sign in')
    expect(anon).toContain('Register')
    expect(anon).not.toContain('data-testid="account-menu"')
  })

  it('pasa los flags al AccountMenu (los ítems gateados viven en el dropdown)', () => {
    const on = render({ flags: { rfq: true, credit: false, approvals: true } })
    expect(on).toContain('data-rfq="true"')
    expect(on).toContain('data-credit="false"')
    expect(on).toContain('data-approvals="true"')
  })

  it('badge del carrito solo con cartCount > 0', () => {
    expect(render({ cartCount: 0 })).not.toMatch(/>\s*0\s*<\/span>/)
    expect(render({ cartCount: 3 })).toContain('>3</span>')
  })
})
