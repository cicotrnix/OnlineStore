import { Card, CardBody } from '@/components/ui/Card'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'
import { filterForOrg } from '@/modules/catalog'
import { getStoreConfig } from '@/stores'
import type { Category, Product } from '@prisma/client'
import Link from 'next/link'

export async function FeaturedGrid({ limit = 8 }: { limit?: number }) {
  const session = await auth()
  const orgId = session?.impersonatingOrgId ?? session?.activeOrgId ?? null

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isPrivate: false,
      category: { isPrivate: false },
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: limit * 2,
  })

  const visible = orgId
    ? await filterForOrg(orgId, products as (Product & { category: Category })[])
    : products
  const final = visible.slice(0, limit)

  if (final.length === 0) return null

  return (
    <section aria-labelledby="featured-heading" className="mt-16">
      <h2 id="featured-heading" className="text-xl font-medium tracking-tight">
        Productos destacados
      </h2>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {final.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.slug}`}>
              <Card className="hover:border-gray-400 h-full">
                <CardBody>
                  <h3 className="font-medium text-sm line-clamp-2">{p.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{p.category.name}</p>
                  {session?.user ? (
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
    </section>
  )
}
