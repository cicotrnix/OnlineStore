import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function InvoiceDetailPage({ params }: Props) {
  if (!isFeatureEnabled('credit')) notFound()
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || !session.activeOrgId) notFound()

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { order: true, paidBy: true },
  })
  if (!inv || inv.organizationId !== session.activeOrgId) notFound()

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight font-mono">{inv.number}</h1>
          <p className="mt-1 text-xs text-gray-500">
            Orden{' '}
            <Link href={`/orders/${inv.orderId}`} className="font-mono underline">
              {inv.order.orderNumber}
            </Link>
          </p>
        </div>
        <Badge
          variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'info'}
        >
          {inv.status}
        </Badge>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-medium">Detalle</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Emitida</span>
            <span>{inv.issuedAt.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vence</span>
            <span>{inv.dueDate.toLocaleDateString()}</span>
          </div>
          {inv.paidAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pagada</span>
              <span>{inv.paidAt.toLocaleDateString()}</span>
            </div>
          )}
          {inv.paidNote && (
            <div>
              <div className="text-gray-500">Referencia de pago</div>
              <div className="mt-1 whitespace-pre-wrap">{inv.paidNote}</div>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-gray-100 font-medium">
            <span>Monto</span>
            <span className="tabular-nums">{formatMoney(inv.amount, inv.currency)}</span>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
