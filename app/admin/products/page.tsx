import { AuthField } from '@/app/(auth)/AuthField'
import { createProductAction, toggleProductActiveAction } from '@/app/admin/_actions'
import { toggleProductPrivateAction, upsertProductTierAction } from '@/app/admin/_actions-fase2'
import { enqueueBulkContentGenAction } from '@/app/admin/products/_ai-actions'
import { AdminPageHeader, type Column, DataTable, StatusBadge, adminBtn } from '@/components/admin'
import { StockBadge } from '@/components/commerce/StockBadge'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { catalogService } from '@/modules/catalog'
import { getStoreConfig } from '@/stores'

type Props = { searchParams: Promise<{ flash?: string; n?: string }> }

const ROW_BTN =
  'rounded-button border border-line px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-accent hover:text-ink-950'

export default async function AdminProductsPage({ searchParams }: Props) {
  const sp = await searchParams
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const bulkMessage =
    sp.flash === 'bulk-queued' ? t(locale, 'admin.products.bulkQueued', { n: sp.n ?? '?' }) : null
  const products = await catalogService.listProducts({ activeOnly: false, take: 100 })
  const categories = await catalogService.listCategories(false)
  const currency = getStoreConfig().currency.base
  const showPrivate = isFeatureEnabled('privateCatalogs')
  const showTiers = isFeatureEnabled('volumeDiscounts')
  const allTiers = showTiers
    ? await prisma.productPriceTier.findMany({ orderBy: [{ productId: 'asc' }, { minQty: 'asc' }] })
    : []
  const tiersByProduct = new Map<string, typeof allTiers>()
  for (const tier of allTiers) {
    const arr = tiersByProduct.get(tier.productId) ?? []
    arr.push(tier)
    tiersByProduct.set(tier.productId, arr)
  }
  const productPrivateMap = new Map<string, boolean>()
  if (showPrivate) {
    const rows = await prisma.product.findMany({ select: { id: true, isPrivate: true } })
    for (const r of rows) productPrivateMap.set(r.id, r.isPrivate)
  }

  type Row = (typeof products)[number]
  const columns: Column<Row>[] = [
    {
      key: 'sku',
      header: t(locale, 'admin.products.col.sku'),
      className: 'font-mono text-xs',
      cell: (p) => p.sku,
    },
    { key: 'name', header: t(locale, 'admin.products.col.product'), cell: (p) => p.name },
    {
      key: 'category',
      header: t(locale, 'admin.products.col.category'),
      className: 'text-ink-500',
      cell: (p) => p.category.name,
    },
    {
      key: 'price',
      header: t(locale, 'admin.products.col.price'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (p) => formatMoney(p.basePrice, currency),
    },
    {
      key: 'stock',
      header: t(locale, 'admin.products.col.stock'),
      cell: (p) => <StockBadge stockQuantity={p.stockQuantity} />,
    },
    {
      key: 'status',
      header: t(locale, 'admin.products.col.status'),
      cell: (p) => (
        <StatusBadge tone={p.isActive ? 'success' : 'neutral'}>
          {p.isActive ? t(locale, 'admin.products.active') : t(locale, 'admin.products.inactive')}
        </StatusBadge>
      ),
    },
    ...(showPrivate
      ? [
          {
            key: 'private',
            header: t(locale, 'admin.products.col.private'),
            cell: (p: Row) => (
              <form action={toggleProductPrivateAction}>
                <input type="hidden" name="id" value={p.id} />
                <input
                  type="hidden"
                  name="isPrivate"
                  value={productPrivateMap.get(p.id) ? 'true' : 'false'}
                />
                <SubmitButton pendingLabel={t(locale, 'common.pending')} className={ROW_BTN}>
                  {productPrivateMap.get(p.id) ? t(locale, 'common.yes') : t(locale, 'common.no')}
                </SubmitButton>
              </form>
            ),
          },
        ]
      : []),
    {
      key: 'action',
      header: t(locale, 'admin.products.col.action'),
      align: 'right',
      cell: (p) => (
        <form action={toggleProductActiveAction}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="isActive" value={p.isActive ? 'true' : 'false'} />
          <SubmitButton pendingLabel={t(locale, 'common.pending')} className={ROW_BTN}>
            {p.isActive ? t(locale, 'admin.action.deactivate') : t(locale, 'admin.action.activate')}
          </SubmitButton>
        </form>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      {bulkMessage && (
        <output
          aria-live="polite"
          className="block rounded-card border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink-950"
        >
          {bulkMessage}
        </output>
      )}

      <AdminPageHeader
        title={t(locale, 'admin.products.title')}
        subtitle={t(locale, 'admin.products.count', { count: products.length })}
        action={
          <form action={enqueueBulkContentGenAction}>
            <SubmitButton
              pendingLabel={t(locale, 'admin.action.enqueuing')}
              className={adminBtn.secondary}
            >
              {t(locale, 'admin.action.generateAllContent')}
            </SubmitButton>
          </form>
        }
      />

      {/* Nuevo producto */}
      <section className="rounded-card border border-line p-5">
        <h2 className="text-sm font-semibold text-ink-950">
          {t(locale, 'admin.products.newProduct')}
        </h2>
        <form action={createProductAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <AuthField
            name="sku"
            label={t(locale, 'admin.products.f.sku')}
            required
            placeholder="SKU-001"
          />
          <AuthField
            name="slug"
            label={t(locale, 'admin.products.f.slug')}
            required
            placeholder="producto-1"
          />
          <div className="sm:col-span-2">
            <AuthField name="name" label={t(locale, 'admin.products.f.name')} required />
          </div>
          <AuthField
            name="basePrice"
            label={t(locale, 'admin.products.f.basePrice')}
            type="number"
            step="0.01"
            min="0.01"
            required
          />
          <AuthField
            name="stockQuantity"
            label={t(locale, 'admin.products.f.stock')}
            type="number"
            min={0}
            defaultValue={0}
          />
          <div className="sm:col-span-2">
            <AuthField name="imageUrl" label={t(locale, 'admin.products.f.imageUrl')} type="url" />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="categoryId"
              className="block text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              {t(locale, 'admin.products.f.category')}
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              className="mt-1 w-full rounded-button border border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">{t(locale, 'admin.products.chooseCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="block text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              {t(locale, 'admin.products.f.description')}
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 w-full rounded-button border border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton
              pendingLabel={t(locale, 'admin.action.creating')}
              className={adminBtn.primary}
            >
              {t(locale, 'admin.action.createProduct')}
            </SubmitButton>
          </div>
        </form>
      </section>

      <DataTable columns={columns} rows={products} getRowKey={(p) => p.id} empty="—" />

      {showTiers && (
        <section className="rounded-card border border-line p-5">
          <h2 className="text-sm font-semibold text-ink-950">
            {t(locale, 'admin.products.tiers.title')}
          </h2>
          <p className="mt-1 text-xs text-ink-500">{t(locale, 'admin.products.tiers.hint')}</p>
          <div className="mt-4 space-y-4">
            {products.map((p) => {
              const tiers = tiersByProduct.get(p.id) ?? []
              return (
                <div key={p.id} className="rounded-card border border-line p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink-950">{p.name}</div>
                      <div className="font-mono text-xs text-ink-500">{p.sku}</div>
                    </div>
                    <div className="text-xs text-ink-500">
                      {t(locale, 'admin.products.tiers.base')} {formatMoney(p.basePrice, currency)}
                    </div>
                  </div>
                  {tiers.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-ink-700">
                      {tiers.map((tier) => (
                        <li key={tier.id} className="flex justify-between">
                          <span>
                            {t(locale, 'admin.products.tiers.minQtyRow', { n: tier.minQty })}
                          </span>
                          <span className="font-mono tabular-nums">
                            {formatMoney(tier.unitPrice, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    action={upsertProductTierAction}
                    className="mt-2 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="productId" value={p.id} />
                    <div className="w-32">
                      <AuthField
                        name="minQty"
                        label={t(locale, 'admin.products.tiers.minQty')}
                        type="number"
                        min={2}
                        required
                      />
                    </div>
                    <div className="w-32">
                      <AuthField
                        name="unitPrice"
                        label={t(locale, 'admin.products.tiers.unitPrice')}
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                      />
                    </div>
                    <SubmitButton
                      pendingLabel={t(locale, 'admin.action.saving')}
                      className={adminBtn.secondary}
                    >
                      {t(locale, 'admin.action.saveTier')}
                    </SubmitButton>
                  </form>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
