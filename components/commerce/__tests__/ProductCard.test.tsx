import { Decimal } from '@prisma/client/runtime/library'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// El form action arrastra la cadena server (auth/db/next-headers) — mock en jsdom.
vi.mock('@/app/(storefront)/_actions', () => ({ addToCartAction: vi.fn() }))
// SubmitButton usa useFormStatus (react-dom), no disponible en jsdom puro.
vi.mock('@/components/ui/SubmitButton', () => ({
  SubmitButton: ({ children }: { children: React.ReactNode }) => (
    <button type="submit">{children}</button>
  ),
}))

import { ProductCard } from '../ProductCard'

const base = {
  id: 'p1',
  slug: 'iphone-13',
  sku: 'PP-BC-13',
  name: 'iPhone 13 High Capacity Battery',
  imageUrl: '/products/iphone-13.png',
  basePrice: new Decimal('9.00'),
  stockQuantity: 100,
  attributes: { spot_welding_required: true } as unknown,
  category: { slug: 'battery-cell' },
}

const renderCard = (overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) =>
  render(
    <ProductCard
      product={{ ...base, ...overrides }}
      currency="USD"
      canAddToCart
      locale="en-US"
      showPrice
      {...props}
    />
  )

describe('ProductCard — estados de stock', () => {
  it('in_stock → botón Add, sin Notify', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /notify/i })).toBeNull()
  })
  it('incoming → Notify, sin Add', () => {
    renderCard({ stockQuantity: 0, attributes: { incoming: true } })
    expect(screen.getByRole('link', { name: /notify/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^add/i })).toBeNull()
  })
  it('coming_soon → Notify', () => {
    renderCard({ stockQuantity: 0, attributes: { coming_soon: true } })
    expect(screen.getByRole('link', { name: /notify/i })).toBeInTheDocument()
  })
  it('coming_soon NO muestra precio (0.00 placeholder)', () => {
    renderCard({
      stockQuantity: 0,
      basePrice: new Decimal('0.00'),
      attributes: { coming_soon: true },
    })
    expect(screen.queryByText(/\$/)).toBeNull()
  })
})

describe('ProductCard — chips por atributo', () => {
  it('spot weld', () => {
    renderCard()
    expect(screen.getByText(/spot weld/i)).toBeInTheDocument()
  })
  it('plug & play', () => {
    renderCard({ attributes: { plug_and_play: true } })
    expect(screen.getByText(/plug & play/i)).toBeInTheDocument()
  })
  it('flex programmed', () => {
    renderCard({ attributes: { flex_programmed: true } })
    expect(screen.getByText(/flex programmed/i)).toBeInTheDocument()
  })
  it('tag-on por categoría', () => {
    renderCard({ attributes: null, category: { slug: 'tag-on-flex' } })
    expect(screen.getByText(/tag-on/i)).toBeInTheDocument()
  })
  it('sello 0-cycle siempre presente', () => {
    renderCard()
    expect(screen.getByText(/0-cycle/i)).toBeInTheDocument()
  })
  it('plug & play → chip Genuine part + línea de instalación', () => {
    renderCard({
      stockQuantity: 0,
      basePrice: new Decimal('0.00'),
      attributes: { plug_and_play: true, coming_soon: true, genuine_part: true },
      category: { slug: 'plug-and-play' },
    })
    expect(screen.getByText(/genuine part/i)).toBeInTheDocument()
    expect(screen.getByText(/diagnostics wizard/i)).toBeInTheDocument()
  })
  it('no-P&P → sin línea de instalación', () => {
    renderCard()
    expect(screen.queryByText(/diagnostics wizard/i)).toBeNull()
  })
})

describe('ProductCard — capacidad gated (FU-010)', () => {
  it('muestra +X% solo si capacity real', () => {
    renderCard({ attributes: { capacity: '10%' } })
    expect(screen.getByText(/\+10%/)).toBeInTheDocument()
  })
  it('sin capacity no muestra ningún %', () => {
    renderCard()
    expect(screen.queryByText(/\+\d+%/)).toBeNull()
  })
})

describe('ProductCard — gating de precio', () => {
  it('showPrice=false → muestra signInLinkLabel, no precio', () => {
    renderCard({}, { showPrice: false, signInLinkLabel: 'Sign in to see prices →' })
    expect(screen.getByText(/sign in to see prices/i)).toBeInTheDocument()
  })
})

describe('ProductCard — selector de cantidad', () => {
  it('in_stock muestra el stepper de cantidad', () => {
    renderCard()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })
})
