import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { requireAuth } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db/client'
import { getLocale, t } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import { reindexAllAction, retryFailedAction } from './_actions'

export const dynamic = 'force-dynamic'

export default async function AdminSearchPage() {
  const user = await requireAuth()
  const locale = await getLocale({ userId: user.id })
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true },
  })
  if (!u?.isPlatformAdmin) notFound()

  const [pending, processing, done, failed, failedRows] = await Promise.all([
    prisma.searchIndexQueue.count({ where: { status: 'PENDING' } }),
    prisma.searchIndexQueue.count({ where: { status: 'PROCESSING' } }),
    prisma.searchIndexQueue.count({ where: { status: 'DONE' } }),
    prisma.searchIndexQueue.count({ where: { status: 'FAILED' } }),
    prisma.searchIndexQueue.findMany({
      where: { status: 'FAILED' },
      orderBy: { enqueuedAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Búsqueda</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estado de la cola de indexación. Worker corre cada 1 minuto en producción.
        </p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pendientes" value={pending} />
        <StatCard label="Procesando" value={processing} />
        <StatCard label="Hechas" value={done} />
        <StatCard label="Fallidas" value={failed} variant="danger" />
      </section>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Reindexar todo</h2>
          <p className="mt-1 text-xs text-gray-500">
            Encola un UPSERT por cada producto. El worker los procesa gradualmente.
          </p>
        </CardHeader>
        <CardBody>
          <form action={reindexAllAction}>
            <SubmitButton pendingLabel={t(locale, 'admin.action.enqueuing')}>
              {t(locale, 'admin.action.reindexAll')}
            </SubmitButton>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Últimos 20 ítems fallidos</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Producto</th>
                <th className="text-left px-5 py-3 font-medium">Acción</th>
                <th className="text-left px-5 py-3 font-medium">Intentos</th>
                <th className="text-left px-5 py-3 font-medium">Error</th>
                <th className="text-right px-5 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {failedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500">
                    Sin items fallidos.
                  </td>
                </tr>
              ) : (
                failedRows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-mono text-xs">{r.productId}</td>
                    <td className="px-5 py-3">{r.action}</td>
                    <td className="px-5 py-3 tabular-nums">{r.attempts}</td>
                    <td className="px-5 py-3 text-xs text-red-600 max-w-md truncate">
                      {r.lastError ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <form action={retryFailedAction}>
                        <input type="hidden" name="queueItemId" value={r.id} />
                        <SubmitButton
                          variant="ghost"
                          size="sm"
                          pendingLabel={t(locale, 'common.pending')}
                        >
                          {t(locale, 'admin.action.retry')}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: 'default' | 'danger'
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div
          className={`mt-2 text-2xl font-medium tabular-nums ${
            variant === 'danger' && value > 0 ? 'text-red-600' : ''
          }`}
        >
          {value}
        </div>
      </CardBody>
    </Card>
  )
}
