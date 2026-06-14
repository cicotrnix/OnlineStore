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

const base: HeaderProps = {
  variant: 'inner',
  locale: 'en-US',
  isSignedIn: true,
  cartCount: 0,
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

  it('signed-in muestra cuenta + cart; anónimo muestra Sign in + Register', () => {
    const signed = render({ isSignedIn: true })
    expect(signed).toContain('Orders')
    expect(signed).toContain('Buy again')
    expect(signed).toContain('Cart')
    const anon = render({ isSignedIn: false })
    expect(anon).toContain('Sign in')
    expect(anon).toContain('Register')
    expect(anon).not.toContain('Buy again')
  })

  it('flags on/off muestran/ocultan quotes/invoices/approvals', () => {
    const off = render({ flags: { rfq: false, credit: false, approvals: false } })
    expect(off).not.toContain('Quotes')
    expect(off).not.toContain('Invoices')
    expect(off).not.toContain('Approvals')
    const on = render({ flags: { rfq: true, credit: true, approvals: true } })
    expect(on).toContain('Quotes')
    expect(on).toContain('Invoices')
    expect(on).toContain('Approvals')
  })

  it('badge del carrito solo con cartCount > 0', () => {
    expect(render({ cartCount: 0 })).not.toMatch(/>\s*0\s*<\/span>/)
    expect(render({ cartCount: 3 })).toContain('>3</span>')
  })
})
