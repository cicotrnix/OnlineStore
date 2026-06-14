import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileNav } from '../MobileNav'

// SearchBar usa useRouter → stub para SSR/jsdom.
import { vi } from 'vitest'
vi.mock('@/components/commerce/SearchBar', () => ({
  SearchBar: () => <div data-testid="searchbar" />,
}))

describe('MobileNav', () => {
  it('renderiza la hamburguesa con aria-label (drawer cerrado por default)', () => {
    render(
      <MobileNav
        locale="en-US"
        isSignedIn
        flags={{ rfq: false, credit: false, approvals: false }}
        signOut={<button type="button">Sign out</button>}
        notifications={<span>Notifications</span>}
      />
    )
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })
})
