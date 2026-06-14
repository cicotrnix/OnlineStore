import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccountMenu } from '../AccountMenu'

const setup = (flags = { rfq: true, credit: true, approvals: true }) =>
  render(
    <AccountMenu locale="en-US" flags={flags} signOut={<button type="button">Sign out</button>} />
  )

describe('AccountMenu a11y', () => {
  it('el trigger tiene aria-haspopup, aria-expanded=false y aria-controls', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /my account/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')
  })

  it('abre por click: aria-expanded=true, ítems visibles, foco al primer ítem', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /my account/i })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: /^orders$/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /buy again/i })).toBeInTheDocument()
    // foco al primer ítem
    const first = screen.getByRole('menuitem', { name: /^orders$/i })
    expect(document.activeElement).toBe(first)
  })

  it('Esc cierra y devuelve el foco al trigger', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /my account/i })
    fireEvent.click(trigger)
    const menu = screen.getByRole('menu')
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('click fuera cierra', () => {
    setup()
    const trigger = screen.getByRole('button', { name: /my account/i })
    fireEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('flags gatean quotes/invoices/approvals', () => {
    setup({ rfq: false, credit: false, approvals: false })
    fireEvent.click(screen.getByRole('button', { name: /my account/i }))
    expect(screen.queryByRole('menuitem', { name: /quotes/i })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /invoices/i })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /approvals/i })).toBeNull()
  })

  it('renderiza el slot de sign out dentro del menú', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /my account/i }))
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
