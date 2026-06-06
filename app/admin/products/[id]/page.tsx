import { enqueueContentGenAction, publishContentAction } from '@/app/admin/products/_ai-actions'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { LOCALES, type Locale, getLocale, t } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ flash?: string; locale?: string }>
}

const FLASH_MESSAGES: Record<string, (locale?: string) => string> = {
  queued: () => 'Generación AI encolada (EN + ES). El worker procesa cada minuto.',
  published: (locale) => `Contenido publicado para ${locale ?? 'el locale'}. Reindex en cola.`,
}

export default async function AdminProductDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const flashMessage = sp.flash ? FLASH_MESSAGES[sp.flash]?.(sp.locale) : null
  const user = await requireAuth()
  const uiLocale = await getLocale({ userId: user.id })
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
      {flashMessage && (
        <output
          aria-live="polite"
          className="block rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {flashMessage}
        </output>
      )}
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
              <SubmitButton size="sm" pendingLabel={t(uiLocale, 'admin.action.enqueuing')}>
                {t(uiLocale, 'admin.action.generateRegenerate')}
              </SubmitButton>
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
                      <SubmitButton
                        variant="secondary"
                        size="sm"
                        pendingLabel={t(uiLocale, 'admin.action.publishing')}
                      >
                        {t(uiLocale, 'admin.action.publish')}
                      </SubmitButton>
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
