import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { requireActiveOrgId } from '@/lib/auth/active-org'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import { getStoreConfig } from '@/stores'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { submitDraftAction } from '../_actions'

export const dynamic = 'force-dynamic'

export default async function QuoteDraftPage() {
  if (!isFeatureEnabled('rfq')) notFound()
  const session = await auth()
  if (!session?.user?.id) notFound()
  const orgId = await requireActiveOrgId()

  const draft = await prisma.quote.findFirst({
    where: {
      organizationId: orgId,
      requestedById: session.user.id,
      status: 'DRAFT',
    },
    include: { lines: { include: { product: true } } },
  })

  if (!draft || draft.lines.length === 0) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-medium tracking-tight">Borrador de cotización</h1>
        <p className="mt-4 text-sm text-gray-500">
          No tienes un borrador activo. Agrega productos desde el catálogo usando "Solicitar
          cotización".
        </p>
        <Link href="/catalog" className="mt-6 inline-block">
          <Button>Ir al catálogo</Button>
        </Link>
      </main>
    )
  }

  const subtotal = draft.lines.reduce((s, l) => s + l.unitPriceBase.toNumber() * l.qty, 0)

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-medium tracking-tight">Borrador de cotización</h1>
      <p className="mt-1 text-sm text-gray-500">
        Revisa los productos y envía la solicitud al equipo comercial.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-medium">Líneas</h2>
        </CardHeader>
        <CardBody className="px-0 py-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-5 py-2 font-medium">SKU</th>
                <th className="text-left px-5 py-2 font-medium">Producto</th>
                <th className="text-right px-5 py-2 font-medium">Precio base</th>
                <th className="text-right px-5 py-2 font-medium">Cant.</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-5 py-2 font-mono text-xs">{l.sku}</td>
                  <td className="px-5 py-2">{l.name}</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {formatMoney(l.unitPriceBase, getStoreConfig().currency.base)}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">{l.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <form action={submitDraftAction} className="space-y-4">
            <input type="hidden" name="quoteId" value={draft.id} />
            <div>
              <label
                htmlFor="notes"
                className="block text-xs uppercase tracking-wide text-gray-500"
              >
                Notas para el equipo (opcional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder="Plazos, condiciones especiales, etc."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Subtotal estimado:{' '}
                <span className="font-medium tabular-nums">${subtotal.toFixed(2)}</span>
              </span>
              <Button type="submit">Enviar solicitud</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  )
}
