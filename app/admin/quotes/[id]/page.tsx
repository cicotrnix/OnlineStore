import { quoteOrReviseAction } from '@/app/admin/_actions-fase2'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function AdminQuoteDetailPage({ params }: Props) {
  const { id } = await params
  const q = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      organization: true,
      requestedBy: true,
      quotedBy: true,
    },
  })
  if (!q) notFound()

  const canQuote = q.status === 'SUBMITTED'
  const canRevise = q.status === 'QUOTED'

  const defaultValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium tracking-tight font-mono">{q.number}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {q.organization.name} · {q.requestedBy.email} · {q.createdAt.toLocaleString()}
          </p>
        </div>
        <Badge variant="info">{q.status}</Badge>
      </div>

      {q.notes && (
        <Card>
          <CardBody>
            <h2 className="text-xs uppercase tracking-wide text-gray-500">Notas del cliente</h2>
            <p className="mt-1 text-sm whitespace-pre-wrap">{q.notes}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-medium">
            {canQuote ? 'Cotizar' : canRevise ? 'Revisar precios' : 'Líneas'}
          </h2>
        </CardHeader>
        <CardBody>
          {canQuote || canRevise ? (
            <form action={quoteOrReviseAction} className="space-y-4">
              <input type="hidden" name="quoteId" value={q.id} />
              <input type="hidden" name="action" value={canRevise ? 'revise' : 'quote'} />

              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left py-2 font-medium">SKU</th>
                    <th className="text-left py-2 font-medium">Producto</th>
                    <th className="text-right py-2 font-medium">Base</th>
                    <th className="text-right py-2 font-medium">Cant.</th>
                    <th className="text-right py-2 font-medium">Cotizado</th>
                  </tr>
                </thead>
                <tbody>
                  {q.lines.map((l) => (
                    <tr key={l.id} className="border-t border-gray-100">
                      <td className="py-2 font-mono text-xs">{l.sku}</td>
                      <td className="py-2">{l.name}</td>
                      <td className="py-2 text-right tabular-nums text-gray-500">
                        {formatMoney(l.unitPriceBase, q.currency)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{l.qty}</td>
                      <td className="py-2 text-right">
                        <Input
                          name={`price[${l.id}]`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={l.unitPriceQuoted?.toString() ?? ''}
                          required
                          className="w-24 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="validUntil"
                    className="text-xs uppercase tracking-wide text-gray-500"
                  >
                    Válida hasta
                  </label>
                  <Input
                    id="validUntil"
                    name="validUntil"
                    type="date"
                    required
                    defaultValue={q.validUntil?.toISOString().slice(0, 10) ?? defaultValidUntil}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="adminNotes"
                  className="text-xs uppercase tracking-wide text-gray-500"
                >
                  Notas internas
                </label>
                <textarea
                  id="adminNotes"
                  name="adminNotes"
                  rows={2}
                  defaultValue={q.adminNotes ?? ''}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">{canRevise ? 'Revisar' : 'Cotizar'}</Button>
              </div>
            </form>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left py-2 font-medium">SKU</th>
                  <th className="text-left py-2 font-medium">Producto</th>
                  <th className="text-right py-2 font-medium">Precio</th>
                  <th className="text-right py-2 font-medium">Cant.</th>
                  <th className="text-right py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="py-2 font-mono text-xs">{l.sku}</td>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-right tabular-nums">
                      {l.unitPriceQuoted
                        ? formatMoney(l.unitPriceQuoted, q.currency)
                        : formatMoney(l.unitPriceBase, q.currency)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{l.qty}</td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatMoney(l.lineTotal, q.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
