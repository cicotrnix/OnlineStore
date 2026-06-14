import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QuantityStepper } from '../QuantityStepper'

const setup = () =>
  render(
    <QuantityStepper
      name="quantity"
      decrementLabel="Decrease quantity"
      incrementLabel="Increase quantity"
    />
  )

describe('QuantityStepper', () => {
  it('arranca en 1 por default', () => {
    setup()
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
  })
  it('+ incrementa', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /increase/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(2)
  })
  it('− no baja de 1 (mínimo)', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /decrease/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
  })
  it('el input se llama "quantity" (se envía en el form)', () => {
    setup()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('name', 'quantity')
  })
  it('− y + tienen aria-label', () => {
    setup()
    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeInTheDocument()
  })
})
