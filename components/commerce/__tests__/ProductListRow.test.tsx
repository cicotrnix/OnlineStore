import { Decimal } from '@prisma/client/runtime/library'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(storefront)/_actions', () => ({ addToCartAction: vi.fn() }))
vi.mock('@/components/ui/SubmitButton', () => ({
  SubmitButton: ({ children }: { children: React.ReactNode }) => (
    <button type="submit">{children}</button>
  ),
}))

import { ProductListRow } from '../ProductListRow'

const base = {
  id: 'p1',
  slug: 'iphone-13',
  sku: 'PP-BC-13',
  name: 'iPhone 13 High Capacity Battery',
  basePrice: new Decimal('9.00'),
  stockQuantity: 100,
  attributes: { spot_welding_required: true } as unknown,
  category: { name: 'Battery Cell', slug: 'battery-cell' },
}

const renderRow = (overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) =>
  render(
    <table>
      <tbody>
        <ProductListRow
          product={{ ...base, ...overrides }}
          currency="USD"
          canAddToCart
          locale="en-US"
          showPrice
          {...props}
        />
      </tbody>
    </table>
  )

describe('ProductListRow — estados de stock', () => {
  it('in_stock → stepper de cantidad + Add', () => {
    renderRow()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })
  it('incoming → Notify, sin Add', () => {
    renderRow({ stockQuantity: 0, attributes: { incoming: true } })
    expect(screen.getByRole('link', { name: /notify/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^add/i })).toBeNull()
  })
  it('muestra el estado de stock como texto (no color-only)', () => {
    renderRow()
    expect(screen.getByText(/in stock/i)).toBeInTheDocument()
  })
})

describe('ProductListRow — chips compactos por atributo', () => {
  it('spot weld', () => {
    renderRow()
    expect(screen.getByText(/spot weld/i)).toBeInTheDocument()
  })
  it('flex programmed', () => {
    renderRow({ attributes: { flex_programmed: true } })
    expect(screen.getByText(/flex programmed/i)).toBeInTheDocument()
  })
})

describe('ProductListRow — gating de precio', () => {
  it('showPrice=false → signInLabel, no precio', () => {
    renderRow({}, { showPrice: false, signInLabel: 'Sign in' })
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })
})
