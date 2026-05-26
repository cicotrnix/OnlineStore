import { createProductAction, toggleProductActiveAction } from '@/app/admin/_actions'
import { StockBadge } from '@/components/commerce/StockBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatMoney } from '@/lib/money'
import { catalogService } from '@/modules/catalog'
import storeConfig from '@/store.config'

export default async function AdminProductsPage() {
  const products = await catalogService.listProducts({
    activeOnly: false,
    take: 100,
  })
  const categories = await catalogService.listCategories(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Productos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {products.length} producto{products.length === 1 ? '' : 's'} registrados.
        </p>
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
    </div>
  )
}
