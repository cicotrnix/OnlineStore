import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/db/client'
import { formatMoney } from '@/lib/money'
import { getStoreConfig } from '@/stores'

export const dynamic = 'force-dynamic'

export default async function AdminApprovalsPage() {
  const requests = await prisma.approvalRequest.findMany({
    include: { organization: true, requestedBy: true, decidedBy: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Aprobaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          {requests.filter((r) => r.status === 'PENDING').length} pendientes
        </p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Cliente</th>
              <th className="text-left px-5 py-3 font-medium">Subject</th>
              <th className="text-right px-5 py-3 font-medium">Monto</th>
              <th className="text-right px-5 py-3 font-medium">Threshold</th>
              <th className="text-left px-5 py-3 font-medium">Solicitante</th>
              <th className="text-left px-5 py-3 font-medium">Estado</th>
              <th className="text-left px-5 py-3 font-medium">Creada</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-5 py-3">{r.organization.name}</td>
                <td className="px-5 py-3 text-xs uppercase">{r.subjectType}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatMoney(r.amount, getStoreConfig().currency.base)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                  {formatMoney(r.threshold, getStoreConfig().currency.base)}
                </td>
                <td className="px-5 py-3 text-xs">{r.requestedBy.email}</td>
                <td className="px-5 py-3">
                  <Badge
                    variant={
                      r.status === 'PENDING'
                        ? 'warning'
                        : r.status === 'APPROVED'
                          ? 'success'
                          : 'danger'
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {r.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
