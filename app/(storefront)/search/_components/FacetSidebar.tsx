import type { FacetCounts } from '@/modules/search'
import Link from 'next/link'

type Props = {
  facets: FacetCounts
  currentParams: URLSearchParams
}

function buildHref(currentParams: URLSearchParams, updater: (p: URLSearchParams) => void): string {
  const params = new URLSearchParams(currentParams)
  updater(params)
  return `/search?${params.toString()}`
}

export function FacetSidebar({ facets, currentParams }: Props) {
  return (
    <aside aria-labelledby="facets-heading" className="space-y-6">
      <h2 id="facets-heading" className="text-xs uppercase tracking-wide text-gray-500">
        Filtros
      </h2>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium mb-1">Categoría</legend>
        <ul className="space-y-1">
          {facets.categories.length === 0 ? (
            <li className="text-xs text-gray-400">Sin resultados</li>
          ) : (
            facets.categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={buildHref(currentParams, (p) => {
                    p.set('category', c.id)
                    p.delete('page')
                  })}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  {c.name} <span className="text-gray-400 tabular-nums">({c.count})</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium mb-1">Precio</legend>
        <ul className="space-y-1">
          {facets.priceBuckets.map((b) => (
            <li key={b.label}>
              <Link
                href={buildHref(currentParams, (p) => {
                  p.set('priceMin', String(b.min))
                  if (b.max != null) p.set('priceMax', String(b.max))
                  else p.delete('priceMax')
                  p.delete('page')
                })}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                {b.label} <span className="text-gray-400 tabular-nums">({b.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium mb-1">Stock</legend>
        <Link
          href={buildHref(currentParams, (p) => {
            p.set('inStock', '1')
            p.delete('page')
          })}
          className="text-sm text-gray-700 hover:text-gray-900"
        >
          Solo con stock <span className="text-gray-400 tabular-nums">({facets.inStockCount})</span>
        </Link>
      </fieldset>

      {(currentParams.get('category') ||
        currentParams.get('priceMin') ||
        currentParams.get('inStock')) && (
        <Link
          href={`/search?q=${encodeURIComponent(currentParams.get('q') ?? '')}`}
          className="block text-xs text-gray-500 underline"
        >
          Limpiar filtros
        </Link>
      )}
    </aside>
  )
}
