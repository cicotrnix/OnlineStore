import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthField } from '../AuthField'

describe('AuthField', () => {
  it('label real ligado al input (htmlFor/id)', () => {
    render(<AuthField name="email" label="Email" type="email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('error → texto role=alert + aria-invalid + aria-describedby ligado', () => {
    render(<AuthField name="password" label="Password" error="Too weak" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const err = screen.getByText('Too weak')
    expect(err).toHaveAttribute('role', 'alert')
    expect(input.getAttribute('aria-describedby')).toBe(err.id)
  })

  it('sin error → sin aria-invalid', () => {
    render(<AuthField name="email" label="Email" />)
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
  })

  it('labelHidden → label sr-only pero accesible', () => {
    render(<AuthField name="email" label="Email" labelHidden />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})
