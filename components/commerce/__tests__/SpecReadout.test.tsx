import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SpecReadout } from '../SpecReadout'

describe('SpecReadout — columnas dinámicas según rows.length', () => {
  it('2 rows (health/cycles) → grid-cols-2 (sin hueco)', () => {
    const { container } = render(
      <SpecReadout
        locale="en-US"
        rows={[
          { value: '100%', labelKey: 'spec.label.health' },
          { value: '0', labelKey: 'spec.label.cycles' },
        ]}
      />
    )
    const dl = container.querySelector('dl')
    expect(dl?.className).toContain('grid-cols-2')
    expect(dl?.className).not.toContain('grid-cols-3')
  })

  it('3 rows (con capacity real) → grid-cols-3', () => {
    const { container } = render(
      <SpecReadout
        locale="en-US"
        rows={[
          { value: '100%', labelKey: 'spec.label.health' },
          { value: '0', labelKey: 'spec.label.cycles' },
          { value: '+10%', up: true, labelKey: 'spec.label.capacity' },
        ]}
      />
    )
    expect(container.querySelector('dl')?.className).toContain('grid-cols-3')
  })

  it('renderiza valores y labels', () => {
    const { getByText } = render(
      <SpecReadout
        locale="en-US"
        rows={[
          { value: '100%', labelKey: 'spec.label.health' },
          { value: '0', labelKey: 'spec.label.cycles' },
        ]}
      />
    )
    expect(getByText('100%')).toBeInTheDocument()
    expect(getByText(/health/i)).toBeInTheDocument()
  })
})
