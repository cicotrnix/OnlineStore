import Link from 'next/link'

type Props = {
  total: number
  pageSize: number
  currentPage: number
  baseParams: URLSearchParams
}

export function Pagination({ total, pageSize, currentPage, baseParams }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  function pageHref(p: number): string {
    const params = new URLSearchParams(baseParams)
    params.set('page', String(p))
    return `/search?${params.toString()}`
  }

  return (
    <nav aria-label="Paginación" className="mt-8 flex justify-center items-center gap-3 text-sm">
      {currentPage > 1 ? (
        <Link
          href={pageHref(currentPage - 1)}
          className="px-3 py-1.5 rounded border border-gray-200 hover:border-gray-400"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-gray-400">← Anterior</span>
      )}
      <span className="text-gray-600">
        Página {currentPage} de {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={pageHref(currentPage + 1)}
          className="px-3 py-1.5 rounded border border-gray-200 hover:border-gray-400"
        >
          Siguiente →
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-gray-400">Siguiente →</span>
      )}
    </nav>
  )
}
