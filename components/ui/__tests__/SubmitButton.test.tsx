import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

let pendingFlag = false
vi.mock('react-dom', async () => {
  const real = await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...real,
    useFormStatus: () => ({ pending: pendingFlag, data: null, method: 'POST', action: null }),
  }
})

import { SubmitButton } from '../SubmitButton'

describe('SubmitButton', () => {
  it('render normal: muestra children, no pending', () => {
    pendingFlag = false
    render(<SubmitButton>Submit</SubmitButton>)
    const btn = screen.getByRole('button', { name: 'Submit' })
    expect(btn).not.toBeDisabled()
    expect(btn.getAttribute('aria-busy')).toBe('false')
  })

  it('pending: disabled + aria-busy + pendingLabel', () => {
    pendingFlag = true
    render(<SubmitButton pendingLabel="Enviando…">Submit</SubmitButton>)
    const btn = screen.getByRole('button', { name: 'Enviando…' })
    expect(btn).toBeDisabled()
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })
})
