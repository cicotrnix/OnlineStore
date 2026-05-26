import { markInvoicePaidAction } from '@/app/admin/_actions-fase2'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'

export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'info',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'default',
}

export default async function AdminInvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { organization: true, order: { select: { orderNumber: true } } },
    orderBy: { issuedAt: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Facturas</h1>
        <p className="text-sm text-gray-500 mt-1">{invoices.length} total</p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Número</th>
              <th className="text-left px-5 py-3 font-medium">Cliente</th>
              <th className="text-left px-5 py-3 font-medium">Orden</th>
              <th className="text-left px-5 py-3 font-medium">Vence</th>
              <th className="text-right px-5 py-3 font-medium">Monto</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-right px-5 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs">{inv.number}</td>
                <td className="px-5 py-3">{inv.organization.name}</td>
                <td className="px-5 py-3 font-mono text-xs">{inv.order.orderNumber}</td>
                <td className="px-5 py-3 text-xs">{inv.dueDate.toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatMoney(inv.amount, inv.currency)}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>{inv.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                    <form action={markInvoicePaidAction} className="inline-flex gap-2">
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <input
                        name="paidNote"
                        placeholder="Referencia"
                        required
                        className="w-32 rounded border border-gray-200 px-2 py-1 text-xs"
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        Marcar pagada
                      </Button>
                    </form>
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
