import type { ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'right'
  /** Clase extra para celdas (p.ej. 'font-mono' / 'tabular-nums'). */
  className?: string
  cell: (row: T) => ReactNode
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  empty?: ReactNode
  /** Acción de fila opcional (botones); se renderiza en una última columna. */
  rowAction?: (row: T) => ReactNode
}

/**
 * Tabla instrument-grade (Back-to-100%): headers mono uppercase, `<th scope>`,
 * números tabulares, empty state, columna de acciones opcional. La consumen las
 * 12 pantallas de admin con tabla.
 */
export function DataTable<T>({ columns, rows, getRowKey, empty, rowAction }: Props<T>) {
  const totalCols = columns.length + (rowAction ? 1 : 0)
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-ink-500">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-2.5 font-mono font-medium ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
            {rowAction && <th scope="col" className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-4 py-8 text-center text-sm text-ink-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className="border-t border-line">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 text-ink-950 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.className ?? ''}`}
                  >
                    {col.cell(row)}
                  </td>
                ))}
                {rowAction && <td className="px-4 py-2.5 text-right">{rowAction(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
