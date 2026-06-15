import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CartLine, type CartLineItem } from '../CartLine'

const item: CartLineItem = {
  productId: 'p1',
  slug: 'iphone-13',
  sku: 'PP-BC-13',
  name: 'iPhone 13 High Capacity Battery',
  imageUrl: '/products/iphone-13.png',
  isActive: true,
  quantity: 2,
  unitPrice: '$9.00',
  lineTotal: '$18.00',
}

const setup = (overrides: Partial<CartLineItem> = {}, density: 'compact' | 'full' = 'full') => {
  const onQuantityChange = vi.fn()
  const onRemove = vi.fn()
  render(
    <CartLine
      item={{ ...item, ...overrides }}
      density={density}
      locale="en-US"
      onQuantityChange={onQuantityChange}
      onRemove={onRemove}
    />
  )
  return { onQuantityChange, onRemove }
}

describe('CartLine', () => {
  it('muestra nombre y total de línea', () => {
    setup()
    expect(screen.getByText(/iPhone 13 High Capacity/i)).toBeInTheDocument()
    expect(screen.getByText('$18.00')).toBeInTheDocument()
  })

  it('full muestra el SKU; compact no', () => {
    const { unmount } = render(
      <CartLine
        item={item}
        density="full"
        locale="en-US"
        onQuantityChange={() => {}}
        onRemove={() => {}}
      />
    )
    expect(screen.getByText(/PP-BC-13/)).toBeInTheDocument()
    unmount()
    render(
      <CartLine
        item={item}
        density="compact"
        locale="en-US"
        onQuantityChange={() => {}}
        onRemove={() => {}}
      />
    )
    expect(screen.queryByText(/PP-BC-13/)).toBeNull()
  })

  it('item inactivo → badge "no longer available"', () => {
    setup({ isActive: false })
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument()
  })

  it('remove tiene aria-label y llama onRemove', () => {
    const { onRemove } = setup()
    const btn = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(btn)
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('+ del stepper llama onQuantityChange con la nueva cantidad', () => {
    const { onQuantityChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }))
    expect(onQuantityChange).toHaveBeenCalledWith(3)
  })
})
