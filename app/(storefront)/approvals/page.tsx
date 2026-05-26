import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import { canApprove } from '@/modules/approvals'
import storeConfig from '@/store.config'
import { notFound } from 'next/navigation'
import { approveAction, rejectAction } from './_actions'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  if (!isFeatureEnabled('approvals')) notFound()
  const session = await auth()
  if (!session?.user?.id || !session.activeOrgId) notFound()
  const allowed = await canApprove(session.user.id, session.activeOrgId)
  if (!allowed) notFound()

  const requests = await prisma.approvalRequest.findMany({
    where: { organizationId: session.activeOrgId },
    include: { requestedBy: true, decidedBy: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-medium tracking-tight">Aprobaciones</h1>
      <p className="mt-1 text-sm text-gray-500">
        {requests.filter((r) => r.status === 'PENDING').length} pendiente
        {requests.filter((r) => r.status === 'PENDING').length === 1 ? '' : 's'}.
      </p>

      {requests.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">Sin solicitudes.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Card>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      {r.subjectType}
                    </div>
                    <div className="font-medium mt-0.5">
                      {formatMoney(r.amount, storeConfig.currency.base)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Solicitado por {r.requestedBy.email} · {r.createdAt.toLocaleString()}
                    </div>
                    {r.reason && (
                      <div className="mt-2 text-xs text-gray-600 italic">Razón: {r.reason}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
                    {r.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <form action={approveAction}>
                          <input type="hidden" name="requestId" value={r.id} />
                          <input type="hidden" name="orgId" value={r.organizationId} />
                          <Button type="submit" size="sm">
                            Aprobar
                          </Button>
                        </form>
                        <form action={rejectAction}>
                          <input type="hidden" name="requestId" value={r.id} />
                          <input type="hidden" name="orgId" value={r.organizationId} />
                          <Button type="submit" variant="danger" size="sm">
                            Rechazar
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
