import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatMoney } from '@/lib/money'
import type { ProductPriceTier } from '@prisma/client'

type Props = {
  tiers: ProductPriceTier[]
  currency: string
}

export function PriceTierTable({ tiers, currency }: Props) {
  if (tiers.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">Descuentos por volumen</h2>
      </CardHeader>
      <CardBody className="px-0 py-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-5 py-2 font-medium">Cantidad mínima</th>
              <th className="text-right px-5 py-2 font-medium">Precio unitario</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-5 py-2 tabular-nums">{t.minQty}+</td>
                <td className="px-5 py-2 text-right tabular-nums font-medium">
                  {formatMoney(t.unitPrice, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  )
}
