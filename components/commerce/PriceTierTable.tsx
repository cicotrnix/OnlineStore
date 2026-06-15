import { type Locale, t } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import type { ProductPriceTier } from '@prisma/client'

type Props = {
  tiers: ProductPriceTier[]
  currency: string
  locale: Locale
}

export function PriceTierTable({ tiers, currency, locale }: Props) {
  if (tiers.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-gray-900">
        {t(locale, 'pdp.volumePricing')}
      </h2>
      <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{t(locale, 'pdp.tierMinQty')}</th>
              <th className="px-4 py-2 text-right font-medium">{t(locale, 'pdp.tierUnitPrice')}</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono tabular-nums">{tier.minQty}+</td>
                <td className="px-4 py-2 text-right font-mono font-medium tabular-nums text-gray-900">
                  {formatMoney(tier.unitPrice, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
