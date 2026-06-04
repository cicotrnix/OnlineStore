import {
  grantCatalogAccessAction,
  revokeCatalogAccessAction,
  setCreditAction,
} from '@/app/admin/_actions-fase2'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'
import storeConfig from '@/store.config'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCustomerCreditPage({ params }: Props) {
  const { id } = await params
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      catalogAccess: {
        include: {
          product: { select: { name: true, sku: true } },
          category: { select: { name: true } },
        },
      },
    },
  })
  if (!org) notFound()

  const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true } })
  const categories = await prisma.category.findMany({ select: { id: true, name: true } })

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">{org.name} · Crédito y catálogo</h1>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Crédito y aprobaciones</h2>
        </CardHeader>
        <CardBody>
          <form action={setCreditAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="orgId" value={org.id} />
            <div>
              <label
                htmlFor="creditLimit"
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Límite de crédito
              </label>
              <Input
                id="creditLimit"
                name="creditLimit"
                type="number"
                step="0.01"
                min="0"
                defaultValue={org.creditLimit?.toString() ?? ''}
                placeholder="vacío = sin crédito"
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="paymentTerms"
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Términos de pago
              </label>
              <select
                id="paymentTerms"
                name="paymentTerms"
                defaultValue={org.paymentTerms}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="PREPAID">Prepago</option>
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
                <option value="NET_60">Net 60</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="approvalThreshold"
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Umbral de aprobación
              </label>
              <Input
                id="approvalThreshold"
                name="approvalThreshold"
                type="number"
                step="0.01"
                min="0"
                defaultValue={org.approvalThreshold?.toString() ?? ''}
                placeholder="vacío = sin aprobaciones"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Uso actual:{' '}
                <strong className="tabular-nums">
                  {formatMoney(org.creditUsed, storeConfig.currency.base)}
                </strong>
              </p>
              <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Acceso a catálogo privado</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="space-y-2">
            {org.catalogAccess.length === 0 ? (
              <li className="text-sm text-gray-500">Sin grants activos.</li>
            ) : (
              org.catalogAccess.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {a.product
                      ? `Producto: ${a.product.name} (${a.product.sku})`
                      : `Categoría: ${a.category?.name ?? '?'}`}
                  </span>
                  <form action={revokeCatalogAccessAction}>
                    <input type="hidden" name="orgId" value={org.id} />
                    {a.productId && <input type="hidden" name="productId" value={a.productId} />}
                    {a.categoryId && <input type="hidden" name="categoryId" value={a.categoryId} />}
                    <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                      Quitar
                    </SubmitButton>
                  </form>
                </li>
              ))
            )}
          </ul>

          <form action={grantCatalogAccessAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="orgId" value={org.id} />
            <div>
              <label
                htmlFor="grantProduct"
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Producto (uno u otro)
              </label>
              <select
                id="grantProduct"
                name="productId"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="grantCategory"
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Categoría
              </label>
              <select
                id="grantCategory"
                name="categoryId"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <SubmitButton className="w-full" pendingLabel="Otorgando…">
                Otorgar acceso
              </SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
