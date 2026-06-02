import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/client'
import { isFeatureEnabled } from '@/lib/features'
import { formatMoney } from '@/lib/money'
import storeConfig from '@/store.config'
import type { Prisma, QuoteStatus } from '@prisma/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: readonly QuoteStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'QUOTED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
]

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviada',
  QUOTED: 'Cotizada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
}

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  QUOTED: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'danger',
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function QuotesPage({ searchParams }: Props) {
  if (!isFeatureEnabled('rfq')) notFound()
  const { requireVerifiedCustomer } = await import('@/lib/auth/customer')
  await requireVerifiedCustomer()
  const session = await auth()
  if (!session?.user?.id || !session.activeOrgId) notFound()

  const { status } = await searchParams
  const where: Prisma.QuoteWhereInput = {
    organizationId: session.activeOrgId,
    requestedById: session.user.id,
  }
  if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
    where.status = status as QuoteStatus
  }

  const quotes = await prisma.quote.findMany({
    where,
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-medium tracking-tight">Mis cotizaciones</h1>
        <Link href="/quotes/draft" className="text-sm underline">
          Editar borrador actual
        </Link>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filtros">
        {[null, 'DRAFT', 'SUBMITTED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((s) => (
          <Link
            key={s ?? 'all'}
            href={s ? `/quotes?status=${s}` : '/quotes'}
            className={`rounded-full border px-3 py-1 text-xs ${
              (status ?? null) === s
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Todas'}
          </Link>
        ))}
      </nav>

      {quotes.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">No tienes cotizaciones en este filtro.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link href={`/quotes/${q.id}`}>
                <Card className="hover:border-gray-400">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-sm">{q.number}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {q.createdAt.toLocaleDateString()} · {q.lines.length} línea
                        {q.lines.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums font-medium">
                        {formatMoney(q.total, storeConfig.currency.base)}
                      </span>
                      <Badge variant={STATUS_VARIANT[q.status] ?? 'default'}>
                        {STATUS_LABELS[q.status] ?? q.status}
                      </Badge>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
