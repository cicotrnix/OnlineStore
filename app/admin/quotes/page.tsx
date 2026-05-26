import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminQuotesPage() {
  const quotes = await prisma.quote.findMany({
    include: { organization: true, requestedBy: true, lines: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Cotizaciones</h1>
        <p className="text-sm text-gray-500 mt-1">{quotes.length} total</p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Número</th>
              <th className="text-left px-5 py-3 font-medium">Cliente</th>
              <th className="text-left px-5 py-3 font-medium">Solicitante</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-right px-5 py-3 font-medium">Total</th>
              <th className="text-left px-5 py-3 font-medium">Creada</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs">
                  <Link href={`/admin/quotes/${q.id}`} className="hover:underline">
                    {q.number}
                  </Link>
                </td>
                <td className="px-5 py-3">{q.organization.name}</td>
                <td className="px-5 py-3 text-xs">{q.requestedBy.email}</td>
                <td className="px-5 py-3">
                  <Badge variant="info">{q.status}</Badge>
                </td>
                <td className="px-5 py-3 tabular-nums text-right">
                  {formatMoney(q.total, q.currency)}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {q.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
