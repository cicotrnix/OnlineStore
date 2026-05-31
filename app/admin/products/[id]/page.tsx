import { enqueueContentGenAction, publishContentAction } from '@/app/admin/products/_ai-actions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { LOCALES, type Locale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth()
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) notFound()

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, slug: true } },
      content: { orderBy: { locale: 'asc' } },
    },
  })
  if (!product) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">{product.name}</h1>
        <p className="mt-1 text-sm text-gray-500 font-mono">
          SKU {product.sku} · {product.category.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-medium">Contenido AI</h2>
            <form action={enqueueContentGenAction}>
              <input type="hidden" name="productId" value={product.id} />
              <Button type="submit" size="sm">
                Generar / Regenerar (EN + ES)
              </Button>
            </form>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Encola jobs para los locales soportados. El worker corre cada minuto en producción.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {LOCALES.map((locale: Locale) => {
            const c = product.content.find((x) => x.locale === locale)
            return (
              <div key={locale} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wide text-gray-500">
                      {locale}
                    </span>
                    {c ? (
                      <Badge variant={c.status === 'PUBLISHED' ? 'success' : 'default'}>
                        {c.status}
                      </Badge>
                    ) : (
                      <Badge variant="default">—</Badge>
                    )}
                  </div>
                  {c?.status === 'DRAFT' && (
                    <form action={publishContentAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <Button type="submit" variant="secondary" size="sm">
                        Publicar
                      </Button>
                    </form>
                  )}
                </div>
                {c?.shortDescription && (
                  <p className="mt-2 text-sm text-gray-700">{c.shortDescription}</p>
                )}
                {c?.longDescriptionMd && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-500">
                      Long description (markdown)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                      {c.longDescriptionMd}
                    </pre>
                  </details>
                )}
                {c?.seoTitle && (
                  <p className="mt-2 text-xs text-gray-500">
                    SEO: <strong>{c.seoTitle}</strong> — {c.seoDescription}
                  </p>
                )}
              </div>
            )
          })}
        </CardBody>
      </Card>
    </div>
  )
}
