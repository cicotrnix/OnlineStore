import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttributeChips } from '../AttributeChips'

describe('AttributeChips', () => {
  it('sello 0-cycle siempre presente', () => {
    render(<AttributeChips attributes={null} locale="en-US" />)
    expect(screen.getByText(/0-cycle/i)).toBeInTheDocument()
  })
  it('spot weld por atributo', () => {
    render(<AttributeChips attributes={{ spot_welding_required: true }} locale="en-US" />)
    expect(screen.getByText(/spot weld/i)).toBeInTheDocument()
  })
  it('tag-on por categoría (no por nombre)', () => {
    render(<AttributeChips attributes={null} categorySlug="tag-on-flex" locale="en-US" />)
    expect(screen.getByText(/tag-on/i)).toBeInTheDocument()
  })
  it('genuine part por atributo', () => {
    render(<AttributeChips attributes={{ genuine_part: true }} locale="en-US" />)
    expect(screen.getByText(/genuine part/i)).toBeInTheDocument()
  })
})
