import { enqueueContentGenAction, publishContentAction } from '@/app/admin/products/_ai-actions'
import { AdminPageHeader, StatusBadge, adminBtn } from '@/components/admin'
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

export default async function AdminProductDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const user = await requireAuth()
  const uiLocale = await getLocale({ userId: user.id })
  const flashMessage =
    sp.flash === 'queued'
      ? t(uiLocale, 'admin.productDetail.flashQueued')
      : sp.flash === 'published'
        ? t(uiLocale, 'admin.productDetail.flashPublished', { locale: sp.locale ?? '' })
        : null
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
    <div className="max-w-4xl space-y-6">
      {flashMessage && (
        <output
          aria-live="polite"
          className="block rounded-card border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink-950"
        >
          {flashMessage}
        </output>
      )}

      <AdminPageHeader
        title={product.name}
        subtitle={t(uiLocale, 'admin.productDetail.subtitle', {
          sku: product.sku,
          category: product.category.name,
        })}
      />

      <section className="rounded-card border border-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(uiLocale, 'admin.productDetail.aiContent')}
          </h2>
          <form action={enqueueContentGenAction}>
            <input type="hidden" name="productId" value={product.id} />
            <SubmitButton
              pendingLabel={t(uiLocale, 'admin.action.enqueuing')}
              className={adminBtn.primary}
            >
              {t(uiLocale, 'admin.action.generateRegenerate')}
            </SubmitButton>
          </form>
        </div>
        <p className="mt-1 text-xs text-ink-500">{t(uiLocale, 'admin.productDetail.aiHint')}</p>

        <div className="mt-4 space-y-3">
          {LOCALES.map((locale: Locale) => {
            const c = product.content.find((x) => x.locale === locale)
            const published = c?.status === 'PUBLISHED'
            return (
              <div key={locale} className="rounded-card border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wide text-ink-500">
                      {locale}
                    </span>
                    {c ? (
                      <StatusBadge tone={published ? 'success' : 'neutral'}>
                        {published
                          ? t(uiLocale, 'admin.productDetail.published')
                          : t(uiLocale, 'admin.productDetail.draft')}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">—</StatusBadge>
                    )}
                  </div>
                  {c?.status === 'DRAFT' && (
                    <form action={publishContentAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <SubmitButton
                        pendingLabel={t(uiLocale, 'admin.action.publishing')}
                        className={adminBtn.secondary}
                      >
                        {t(uiLocale, 'admin.action.publish')}
                      </SubmitButton>
                    </form>
                  )}
                </div>
                {c?.shortDescription && (
                  <p className="mt-2 text-sm text-ink-700">{c.shortDescription}</p>
                )}
                {c?.longDescriptionMd && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-ink-500">
                      {t(uiLocale, 'admin.productDetail.longDescription')}
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs text-ink-700">
                      {c.longDescriptionMd}
                    </pre>
                  </details>
                )}
                {c?.seoTitle && (
                  <p className="mt-2 text-xs text-ink-500">
                    SEO: <strong className="text-ink-950">{c.seoTitle}</strong> — {c.seoDescription}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
