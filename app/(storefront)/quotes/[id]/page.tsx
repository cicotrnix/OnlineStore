import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import { notFound } from 'next/navigation'
import { acceptQuoteAction, rejectQuoteAction } from '../_actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function QuoteDetailPage({ params }: Props) {
  if (!isFeatureEnabled('rfq')) notFound()
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || !session.activeOrgId) notFound()

  const q = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      organization: { include: { addresses: true } },
      quotedBy: true,
    },
  })
  if (!q || q.organizationId !== session.activeOrgId) notFound()

  const isQuoted = q.status === 'QUOTED'
  const addresses = q.organization.addresses
  const canShowNetTerms = isFeatureEnabled('credit') && q.organization.paymentTerms !== 'PREPAID'

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight font-mono">{q.number}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {q.createdAt.toLocaleString()} ·{' '}
            {q.quotedBy ? `Cotizada por ${q.quotedBy.email}` : 'Sin asignar'}
          </p>
        </div>
        <Badge variant="info">{q.status}</Badge>
      </div>

      {q.adminNotes && (
        <Card className="mt-6">
          <CardBody>
            <h2 className="text-xs uppercase tracking-wide text-gray-500">Notas del equipo</h2>
            <p className="mt-1 text-sm whitespace-pre-wrap">{q.adminNotes}</p>
          </CardBody>
        </Card>
      )}

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
                <th className="text-right px-5 py-2 font-medium">Base</th>
                <th className="text-right px-5 py-2 font-medium">Cotizado</th>
                <th className="text-right px-5 py-2 font-medium">Cant.</th>
                <th className="text-right px-5 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-5 py-2 font-mono text-xs">{l.sku}</td>
                  <td className="px-5 py-2">{l.name}</td>
                  <td className="px-5 py-2 text-right tabular-nums text-gray-500">
                    {formatMoney(l.unitPriceBase, q.currency)}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {l.unitPriceQuoted ? formatMoney(l.unitPriceQuoted, q.currency) : '—'}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">{l.qty}</td>
                  <td className="px-5 py-2 text-right tabular-nums font-medium">
                    {formatMoney(l.lineTotal, q.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody className="flex justify-between text-sm">
          <span className="text-gray-500">Total</span>
          <span className="font-medium tabular-nums">{formatMoney(q.total, q.currency)}</span>
        </CardBody>
      </Card>

      {q.validUntil && (
        <p className="mt-3 text-xs text-gray-500">
          Válida hasta {q.validUntil.toLocaleDateString()}
        </p>
      )}

      {isQuoted && addresses.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-medium">Aceptar cotización</h2>
          </CardHeader>
          <CardBody>
            <form action={acceptQuoteAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="quoteId" value={q.id} />
              <div className="sm:col-span-2">
                <label className="text-xs uppercase tracking-wide text-gray-500">
                  Método de pago
                </label>
                <div className="mt-1 flex gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="paymentMethod" value="PREPAID" defaultChecked />
                    Prepago
                  </label>
                  {canShowNetTerms && (
                    <label className="flex items-center gap-2">
                      <input type="radio" name="paymentMethod" value="NET_TERMS" />
                      {q.organization.paymentTerms.replace('_', ' ')}
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="bill" className="text-xs uppercase tracking-wide text-gray-500">
                  Facturación
                </label>
                <select
                  id="bill"
                  name="billingAddressId"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ship" className="text-xs uppercase tracking-wide text-gray-500">
                  Envío
                </label>
                <select
                  id="ship"
                  name="shippingAddressId"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="submit">Aceptar</Button>
              </div>
            </form>
            <form action={rejectQuoteAction} className="mt-3 flex justify-end">
              <input type="hidden" name="quoteId" value={q.id} />
              <Button type="submit" variant="danger" size="sm">
                Rechazar cotización
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
