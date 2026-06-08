import { Card, CardBody } from '@/components/ui/Card'
import { formatMoney } from '@/lib/money'
import { getStoreConfig } from '@/stores'
import type { Category, Product } from '@prisma/client'
import Link from 'next/link'

type Props = {
  hits: (Product & { category: Category })[]
  signedIn: boolean
}

export function SearchResults({ hits, signedIn }: Props) {
  if (hits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-600">No encontramos productos para tu búsqueda.</p>
        <p className="mt-2 text-sm">
          Probá términos más generales o{' '}
          <Link href="/catalog" className="text-gray-900 underline">
            ver el catálogo completo
          </Link>
          .
        </p>
      </div>
    )
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {hits.map((p) => (
        <li key={p.id}>
          <Link href={`/products/${p.slug}`}>
            <Card className="hover:border-gray-400 h-full">
              <CardBody>
                <h3 className="font-medium text-sm">{p.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{p.category.name}</p>
                <p className="mt-1 text-[10px] text-gray-400 font-mono">SKU {p.sku}</p>
                {signedIn ? (
                  <p className="mt-3 text-sm font-medium tabular-nums">
                    {formatMoney(p.basePrice, getStoreConfig().currency.base)}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-gray-500 italic">
                    Iniciá sesión para ver precios
                  </p>
                )}
              </CardBody>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
