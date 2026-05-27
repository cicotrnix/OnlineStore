import { SearchBar } from '@/components/commerce/SearchBar'
import { auth } from '@/lib/auth/config'
import { ANON_SEARCH_LIMITS, checkRateLimit } from '@/lib/rate-limit'
import { query } from '@/modules/search'
import { headers } from 'next/headers'
import { FacetSidebar } from './_components/FacetSidebar'
import { Pagination } from './_components/Pagination'
import { SearchResults } from './_components/SearchResults'

export const dynamic = 'force-dynamic'

type SearchParams = {
  q?: string
  category?: string
  priceMin?: string
  priceMax?: string
  inStock?: string
  page?: string
}

type Props = {
  searchParams: Promise<SearchParams>
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null
  const signedIn = Boolean(session?.user)

  if (!signedIn) {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = checkRateLimit(`search:anon:${ip}`, ANON_SEARCH_LIMITS)
    if (!rl.allowed) {
      return (
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-medium tracking-tight">Demasiadas búsquedas</h1>
          <p className="mt-3 text-sm text-gray-600">
            Esperá {rl.retryAfterSeconds}s antes de buscar de nuevo, o{' '}
            <a href="/sign-in" className="text-gray-900 underline">
              iniciá sesión
            </a>{' '}
            para no tener límites.
          </p>
        </main>
      )
    }
  }

  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const limit = 24

  const result = q
    ? await query({
        q,
        orgId,
        facets: {
          categoryIds: params.category ? [params.category] : undefined,
          priceMin: params.priceMin ? Number(params.priceMin) : undefined,
          priceMax: params.priceMax ? Number(params.priceMax) : undefined,
          inStockOnly: params.inStock === '1',
        },
        limit,
        offset: (page - 1) * limit,
      })
    : null

  const baseParams = new URLSearchParams()
  if (q) baseParams.set('q', q)
  if (params.category) baseParams.set('category', params.category)
  if (params.priceMin) baseParams.set('priceMin', params.priceMin)
  if (params.priceMax) baseParams.set('priceMax', params.priceMax)
  if (params.inStock) baseParams.set('inStock', params.inStock)

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <SearchBar initialQuery={q} size="lg" />
      </div>

      {!result ? (
        <p className="text-sm text-gray-600">Escribí algo arriba para empezar a buscar.</p>
      ) : (
        <>
          <div aria-live="polite" className="sr-only">
            Se encontraron {result.total} resultados
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
            <FacetSidebar facets={result.facetCounts} currentParams={baseParams} />
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {result.total} resultado{result.total === 1 ? '' : 's'}
                {q && (
                  <>
                    {' '}
                    para <strong>"{q}"</strong>
                  </>
                )}{' '}
                <span className="text-gray-400">· modo {result.mode}</span>
              </p>
              <SearchResults hits={result.hits} signedIn={signedIn} />
              <Pagination
                total={result.total}
                pageSize={limit}
                currentPage={page}
                baseParams={baseParams}
              />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
