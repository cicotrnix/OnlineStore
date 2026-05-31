import { createProductAction, toggleProductActiveAction } from '@/app/admin/_actions'
import { toggleProductPrivateAction, upsertProductTierAction } from '@/app/admin/_actions-fase2'
import { enqueueBulkContentGenAction } from '@/app/admin/products/_ai-actions'
import { StockBadge } from '@/components/commerce/StockBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import { catalogService } from '@/modules/catalog'
import storeConfig from '@/store.config'

export default async function AdminProductsPage() {
  const products = await catalogService.listProducts({
    activeOnly: false,
    take: 100,
  })
  const categories = await catalogService.listCategories(false)
  const showPrivate = isFeatureEnabled('privateCatalogs')
  const showTiers = isFeatureEnabled('volumeDiscounts')
  const allTiers = showTiers
    ? await prisma.productPriceTier.findMany({ orderBy: [{ productId: 'asc' }, { minQty: 'asc' }] })
    : []
  const tiersByProduct = new Map<string, typeof allTiers>()
  for (const t of allTiers) {
    const arr = tiersByProduct.get(t.productId) ?? []
    arr.push(t)
    tiersByProduct.set(t.productId, arr)
  }
  const productPrivateMap = new Map<string, boolean>()
  if (showPrivate) {
    const rows = await prisma.product.findMany({ select: { id: true, isPrivate: true } })
    for (const r of rows) productPrivateMap.set(r.id, r.isPrivate)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Productos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} producto{products.length === 1 ? '' : 's'} registrados.
          </p>
        </div>
        <form action={enqueueBulkContentGenAction}>
          <Button type="submit" variant="secondary" size="sm">
            Generar contenido AI (todos)
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Nuevo producto</h2>
        </CardHeader>
        <CardBody>
          <form action={createProductAction} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sku" className="text-xs uppercase tracking-wide text-gray-500">
                SKU
              </label>
              <Input id="sku" name="sku" required placeholder="SKU-001" className="mt-1" />
            </div>
            <div>
              <label htmlFor="slug" className="text-xs uppercase tracking-wide text-gray-500">
                Slug
              </label>
              <Input id="slug" name="slug" required placeholder="producto-1" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="name" className="text-xs uppercase tracking-wide text-gray-500">
                Nombre
              </label>
              <Input id="name" name="name" required className="mt-1" />
            </div>
            <div>
              <label htmlFor="basePrice" className="text-xs uppercase tracking-wide text-gray-500">
                Precio base (USD)
              </label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="stockQuantity"
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Stock inicial
              </label>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                min="0"
                defaultValue={0}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="imageUrl" className="text-xs uppercase tracking-wide text-gray-500">
                URL imagen (opcional)
              </label>
              <Input id="imageUrl" name="imageUrl" type="url" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="categoryId" className="text-xs uppercase tracking-wide text-gray-500">
                Categoría
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">— elegir —</option>
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
                className="text-xs uppercase tracking-wide text-gray-500"
              >
                Descripción (markdown, opcional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Crear producto</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium">SKU</th>
                <th className="text-left px-5 py-3 font-medium">Producto</th>
                <th className="text-left px-5 py-3 font-medium">Categoría</th>
                <th className="text-left px-5 py-3 font-medium">Precio</th>
                <th className="text-left px-5 py-3 font-medium">Stock</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
                {showPrivate && <th className="text-left px-5 py-3 font-medium">Privado</th>}
                <th className="text-right px-5 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-5 py-3">{p.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{p.category.name}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {formatMoney(p.basePrice, storeConfig.currency.base)}
                  </td>
                  <td className="px-5 py-3">
                    <StockBadge stockQuantity={p.stockQuantity} />
                  </td>
                  <td className="px-5 py-3">
                    {p.isActive ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="default">Inactivo</Badge>
                    )}
                  </td>
                  {showPrivate && (
                    <td className="px-5 py-3">
                      <form action={toggleProductPrivateAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="isPrivate"
                          value={productPrivateMap.get(p.id) ? 'true' : 'false'}
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          {productPrivateMap.get(p.id) ? 'Sí' : 'No'}
                        </Button>
                      </form>
                    </td>
                  )}
                  <td className="px-5 py-3 text-right">
                    <form action={toggleProductActiveAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="isActive" value={p.isActive ? 'true' : 'false'} />
                      <Button type="submit" variant="secondary" size="sm">
                        {p.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showTiers && (
        <Card>
          <CardHeader>
            <h2 className="font-medium">Descuentos por volumen</h2>
            <p className="mt-1 text-xs text-gray-500">
              Define tramos por cantidad. El precio del tramo aplica cuando la cantidad pedida es ≥
              minQty.
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {products.map((p) => {
              const tiers = tiersByProduct.get(p.id) ?? []
              return (
                <div key={p.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Base {formatMoney(p.basePrice, storeConfig.currency.base)}
                    </div>
                  </div>
                  {tiers.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-600 space-y-1">
                      {tiers.map((t) => (
                        <li key={t.id} className="flex justify-between">
                          <span>≥ {t.minQty} uds</span>
                          <span className="tabular-nums">
                            {formatMoney(t.unitPrice, storeConfig.currency.base)}
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
                    <div>
                      <label
                        htmlFor={`minQty-${p.id}`}
                        className="text-[10px] uppercase tracking-wide text-gray-500"
                      >
                        Cantidad mínima
                      </label>
                      <Input
                        id={`minQty-${p.id}`}
                        name="minQty"
                        type="number"
                        min="2"
                        required
                        className="mt-1 w-32"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`unitPrice-${p.id}`}
                        className="text-[10px] uppercase tracking-wide text-gray-500"
                      >
                        Precio unitario
                      </label>
                      <Input
                        id={`unitPrice-${p.id}`}
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        className="mt-1 w-32"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="secondary">
                      Guardar tramo
                    </Button>
                  </form>
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
