import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from '../DataTable'

type Row = { id: string; sku: string; qty: number }

const rows: Row[] = [
  { id: 'a', sku: 'PP-1', qty: 5 },
  { id: 'b', sku: 'PP-2', qty: 12 },
]

const columns = [
  { key: 'sku', header: 'SKU', cell: (r: Row) => r.sku },
  { key: 'qty', header: 'Qty', align: 'right' as const, cell: (r: Row) => r.qty },
]

describe('DataTable', () => {
  it('renderiza headers de columna con scope="col"', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />)
    const sku = screen.getByText('SKU')
    expect(sku.tagName).toBe('TH')
    expect(sku.getAttribute('scope')).toBe('col')
  })

  it('renderiza una celda por fila vía cell()', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />)
    expect(screen.getByText('PP-1')).toBeDefined()
    expect(screen.getByText('PP-2')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
  })

  it('columna align=right aplica text-right a la celda', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />)
    const cell = screen.getByText('5').closest('td')
    expect(cell?.className).toContain('text-right')
  })

  it('sin filas → muestra empty state', () => {
    render(
      <DataTable columns={columns} rows={[]} getRowKey={(r: Row) => r.id} empty="Nothing here" />
    )
    expect(screen.getByText('Nothing here')).toBeDefined()
    // No filas de datos.
    expect(screen.queryByText('PP-1')).toBeNull()
  })
})
