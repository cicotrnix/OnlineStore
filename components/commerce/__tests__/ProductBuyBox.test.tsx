import { Decimal } from '@prisma/client/runtime/library'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(storefront)/_actions', () => ({ addToCartAction: vi.fn() }))
vi.mock('@/components/ui/SubmitButton', () => ({
  SubmitButton: ({ children }: { children: React.ReactNode }) => (
    <button type="submit">{children}</button>
  ),
}))

import { ProductBuyBox } from '../ProductBuyBox'

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

const renderBox = (overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) =>
  render(
    <ProductBuyBox
      product={{ ...base, ...overrides }}
      currency="USD"
      locale="en-US"
      showPrice
      canAddToCart
      signInLabel="Sign in to see prices"
      {...props}
    />
  )

describe('ProductBuyBox — nombre y SEO', () => {
  it('el nombre es el h1 de la página', () => {
    renderBox()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/iPhone 13 High Capacity/i)
  })
})

describe('ProductBuyBox — SpecReadout instrumento', () => {
  it('sin capacity → solo health + cycles (no aparece capacity)', () => {
    renderBox()
    expect(screen.getByText(/health/i)).toBeInTheDocument()
    expect(screen.getByText(/cycles/i)).toBeInTheDocument()
    expect(screen.queryByText(/cap\./i)).toBeNull()
  })
  it('con attributes.capacity real → aparece la columna capacity (FU-010 gate)', () => {
    renderBox({ attributes: { capacity: '10%' } })
    expect(screen.getByText(/cap\./i)).toBeInTheDocument()
    expect(screen.getByText(/10%/)).toBeInTheDocument()
  })
})

describe('ProductBuyBox — gating de precio', () => {
  it('verificado → muestra precio (PriceTag), no el CTA de login', () => {
    renderBox()
    expect(screen.queryByText(/sign in to see prices/i)).toBeNull()
    expect(screen.getByText(/\$9\.00/)).toBeInTheDocument()
  })
  it('anónimo/pending (showPrice=false) → CTA de login, sin precio', () => {
    renderBox({}, { showPrice: false })
    expect(screen.getByText(/sign in to see prices/i)).toBeInTheDocument()
    expect(screen.queryByText(/\$9\.00/)).toBeNull()
  })
})

describe('ProductBuyBox — 3 estados de stock', () => {
  it('in_stock → stepper + Add', () => {
    renderBox()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /notify/i })).toBeNull()
  })
  it('incoming → Notify, sin Add ni stepper', () => {
    renderBox({ stockQuantity: 0, attributes: { incoming: true } })
    expect(screen.getByRole('link', { name: /notify/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^add$/i })).toBeNull()
    expect(screen.queryByRole('spinbutton')).toBeNull()
  })
  it('coming_soon → Notify', () => {
    renderBox({ stockQuantity: 0, attributes: { coming_soon: true } })
    expect(screen.getByRole('link', { name: /notify/i })).toBeInTheDocument()
  })
  it('muestra el estado como texto (no color-only)', () => {
    renderBox()
    expect(screen.getByText(/in stock/i)).toBeInTheDocument()
  })
})
