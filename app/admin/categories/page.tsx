import { createCategoryAction } from '@/app/admin/_actions'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { catalogService } from '@/modules/catalog'

export default async function AdminCategoriesPage() {
  const categories = await catalogService.listCategories(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Categorías</h1>
        <p className="text-sm text-gray-500 mt-1">
          {categories.length} categoría{categories.length === 1 ? '' : 's'}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Nueva categoría</h2>
        </CardHeader>
        <CardBody>
          <form action={createCategoryAction} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="slug" className="text-xs uppercase tracking-wide text-gray-500">
                Slug
              </label>
              <Input id="slug" name="slug" required className="mt-1" placeholder="cosmeticos" />
            </div>
            <div>
              <label htmlFor="name" className="text-xs uppercase tracking-wide text-gray-500">
                Nombre
              </label>
              <Input id="name" name="name" required className="mt-1" />
            </div>
            <div>
              <label htmlFor="sortOrder" className="text-xs uppercase tracking-wide text-gray-500">
                Orden
              </label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={0}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <SubmitButton pendingLabel="Creando…">Crear</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Orden</th>
              <th className="text-left px-5 py-3 font-medium">Slug</th>
              <th className="text-left px-5 py-3 font-medium">Nombre</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-5 py-3 tabular-nums w-16">{c.sortOrder}</td>
                <td className="px-5 py-3 font-mono text-xs">{c.slug}</td>
                <td className="px-5 py-3">{c.name}</td>
                <td className="px-5 py-3">
                  {c.isActive ? (
                    <Badge variant="success">Activa</Badge>
                  ) : (
                    <Badge variant="default">Inactiva</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
