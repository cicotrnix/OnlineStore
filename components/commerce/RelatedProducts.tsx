import { Card, CardBody } from '@/components/ui/Card'
import { formatMoney } from '@/lib/money'
import storeConfig from '@/store.config'
import type { Category, Product } from '@prisma/client'
import Link from 'next/link'

type Props = {
  title: string
  products: (Product & { category: Category })[]
  signedIn: boolean
}

export function RelatedProducts({ title, products, signedIn }: Props) {
  if (products.length === 0) return null
  return (
    <section aria-labelledby="related-heading" className="mt-12 md:col-span-2">
      <h2 id="related-heading" className="text-lg font-medium tracking-tight">
        {title}
      </h2>
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.slug}`}>
              <Card className="hover:border-gray-400 h-full">
                <CardBody>
                  <h3 className="font-medium text-sm line-clamp-2">{p.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{p.category.name}</p>
                  {signedIn ? (
                    <p className="mt-2 text-sm font-medium tabular-nums">
                      {formatMoney(p.basePrice, storeConfig.currency.base)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500 italic">Inicia sesión</p>
                  )}
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
