import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownContent } from '../MarkdownContent'

describe('MarkdownContent — render dep-free de markdown AI', () => {
  it('## heading → h3', () => {
    const { container } = render(<MarkdownContent markdown={'## Compatibilidad'} />)
    const h = container.querySelector('h3')
    expect(h?.textContent).toBe('Compatibilidad')
  })
  it('bullets - → ul/li', () => {
    const { container } = render(<MarkdownContent markdown={'- iPhone 13\n- iPhone 14'} />)
    const items = container.querySelectorAll('ul li')
    expect(items.length).toBe(2)
    expect(items[0]?.textContent).toBe('iPhone 13')
  })
  it('**bold** inline → strong', () => {
    const { container } = render(
      <MarkdownContent markdown={'Requiere **soldadura** por puntos.'} />
    )
    expect(container.querySelector('strong')?.textContent).toBe('soldadura')
  })
  it('párrafos separados por línea en blanco', () => {
    const { container } = render(
      <MarkdownContent markdown={'Primer párrafo.\n\nSegundo párrafo.'} />
    )
    expect(container.querySelectorAll('p').length).toBe(2)
  })
  it('texto plano (no-markdown) → un párrafo legible', () => {
    render(<MarkdownContent markdown={'Celda de alta capacidad para iPhone 13.'} />)
    expect(screen.getByText(/Celda de alta capacidad/)).toBeInTheDocument()
  })
})
