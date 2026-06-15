import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(storefront)/_mini-cart-actions', () => ({
  miniCartSetQuantity: vi.fn(),
  miniCartRemove: vi.fn(),
}))

import { CartEditor } from '../CartEditor'

const data = {
  items: [
    {
      productId: 'p1',
      slug: 'iphone-13',
      sku: 'PP-BC-13',
      name: 'iPhone 13 Battery',
      imageUrl: null,
      isActive: true,
      quantity: 2,
      unitPrice: '$9.00',
      lineTotal: '$18.00',
    },
  ],
  subtotalFormatted: '$18.00',
  count: 2,
}

describe('CartEditor', () => {
  it('renderiza ítems + subtotal + checkout link', () => {
    render(<CartEditor initial={data} locale="en-US" />)
    expect(screen.getByText(/iPhone 13 Battery/)).toBeInTheDocument()
    expect(screen.getAllByText('$18.00').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /checkout/i })).toHaveAttribute('href', '/checkout')
  })

  it('carrito vacío → empty state', () => {
    render(
      <CartEditor initial={{ items: [], subtotalFormatted: '$0.00', count: 0 }} locale="en-US" />
    )
    expect(screen.getByText(/empty/i)).toBeInTheDocument()
  })
})
