import { setCustomerPriceAction } from '@/app/admin/_actions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'
import { catalogService } from '@/modules/catalog'
import { pricingService } from '@/modules/pricing'
import storeConfig from '@/store.config'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCustomerPricesPage({ params }: Props) {
  const { id } = await params
  const org = await prisma.organization.findUnique({ where: { id } })
  if (!org) notFound()

  const products = await catalogService.listProducts({ activeOnly: false, take: 100 })
  const overrides = await pricingService.listForOrg(id)
  const overridesByProduct = new Map(overrides.map((o) => [o.productId, o.price]))

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Precios · <span className="font-mono text-base">{org.name}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Define un precio override por producto. Vacío = aplica el precio base.
        </p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">SKU</th>
              <th className="text-left px-5 py-3 font-medium">Producto</th>
              <th className="text-left px-5 py-3 font-medium">Precio base</th>
              <th className="text-left px-5 py-3 font-medium">Tu precio</th>
              <th className="text-right px-5 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const override = overridesByProduct.get(p.id)
              return (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-5 py-3">{p.name}</td>
                  <td className="px-5 py-3 tabular-nums text-gray-500">
                    {formatMoney(p.basePrice, storeConfig.currency.base)}
                  </td>
                  <td className="px-5 py-3" colSpan={2}>
                    <form action={setCustomerPriceAction} className="flex items-center gap-2">
                      <input type="hidden" name="organizationId" value={org.id} />
                      <input type="hidden" name="productId" value={p.id} />
                      <Input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        defaultValue={override?.toString()}
                        placeholder="—"
                        className="w-28"
                      />
                      <SubmitButton variant="secondary" size="sm" pendingLabel="Guardando…">
                        Guardar
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
