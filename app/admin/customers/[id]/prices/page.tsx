import { setCustomerPriceAction } from '@/app/admin/_actions'
import { AdminPageHeader, type Column, DataTable } from '@/components/admin'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { catalogService } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import { getStoreConfig } from '@/stores'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCustomerPricesPage({ params }: Props) {
  const { id } = await params
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const org = await prisma.organization.findUnique({ where: { id } })
  if (!org) notFound()

  const products = await catalogService.listProducts({ activeOnly: false, take: 100 })
  const overrides = await pricingService.listForOrg(id)
  const overridesByProduct = new Map(overrides.map((o) => [o.productId, o.price]))
  const currency = getStoreConfig().currency.base

  type Row = (typeof products)[number]
  const columns: Column<Row>[] = [
    {
      key: 'sku',
      header: t(locale, 'admin.col.sku'),
      className: 'font-mono text-xs text-ink-500',
      cell: (p) => p.sku,
    },
    { key: 'name', header: t(locale, 'admin.col.product'), cell: (p) => p.name },
    {
      key: 'base',
      header: t(locale, 'admin.prices.basePrice'),
      align: 'right',
      className: 'font-mono tabular-nums text-ink-500',
      cell: (p) => formatMoney(p.basePrice, currency),
    },
    {
      key: 'override',
      header: t(locale, 'admin.prices.yourPrice'),
      cell: (p) => (
        <form action={setCustomerPriceAction} className="flex items-center justify-end gap-2">
          <input type="hidden" name="organizationId" value={org.id} />
          <input type="hidden" name="productId" value={p.id} />
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={overridesByProduct.get(p.id)?.toString()}
            placeholder="—"
            aria-label={`${t(locale, 'admin.prices.yourPrice')} · ${p.sku}`}
            className="w-28 rounded-button border border-ink-100 bg-surface px-2 py-1 text-right text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <SubmitButton variant="outline" size="sm" pendingLabel={t(locale, 'admin.action.saving')}>
            {t(locale, 'admin.action.save')}
          </SubmitButton>
        </form>
      ),
    },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      <AdminPageHeader
        title={t(locale, 'admin.prices.title', { org: org.name })}
        subtitle={t(locale, 'admin.prices.hint')}
      />
      <DataTable columns={columns} rows={products} getRowKey={(p) => p.id} empty="—" />
    </div>
  )
}
