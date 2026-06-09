import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { requireActiveOrgId } from '@/lib/auth/active-org'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'info',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'default',
}

export default async function InvoicesPage() {
  if (!isFeatureEnabled('credit')) notFound()
  const { requireVerifiedCustomer } = await import('@/lib/auth/customer')
  await requireVerifiedCustomer()
  const orgId = await requireActiveOrgId()

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    orderBy: { issuedAt: 'desc' },
    include: { order: { select: { orderNumber: true } } },
  })

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-medium tracking-tight">Facturas</h1>
      <p className="mt-1 text-sm text-gray-500">
        {invoices.length} factura{invoices.length === 1 ? '' : 's'} registrada
        {invoices.length === 1 ? '' : 's'}.
      </p>

      {invoices.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">Aún no hay facturas.</p>
      ) : (
        <Card className="mt-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Número</th>
                <th className="text-left px-5 py-3 font-medium">Orden</th>
                <th className="text-left px-5 py-3 font-medium">Emitida</th>
                <th className="text-left px-5 py-3 font-medium">Vence</th>
                <th className="text-right px-5 py-3 font-medium">Monto</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs">
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{inv.order.orderNumber}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {inv.issuedAt.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {inv.dueDate.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatMoney(inv.amount, inv.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  )
}
