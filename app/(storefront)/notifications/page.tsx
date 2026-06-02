import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { listForUser } from '@/modules/notifications'
import Link from 'next/link'
import { markAllReadAction, markOneReadAction } from './_actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ unread?: string }> }

export default async function NotificationsPage({ searchParams }: Props) {
  const { requireVerifiedCustomer } = await import('@/lib/auth/customer')
  const customer = await requireVerifiedCustomer()
  const user = { id: customer.userId }
  const { unread } = await searchParams
  const items = await listForUser(user.id, { unreadOnly: unread === '1', limit: 100 })

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-medium tracking-tight">Notificaciones</h1>
        <form action={markAllReadAction}>
          <Button type="submit" variant="secondary" size="sm">
            Marcar todas como leídas
          </Button>
        </form>
      </div>
      <nav aria-label="Filtros de notificaciones" className="mt-3 flex gap-2 text-xs">
        <Link
          href="/notifications"
          className={`rounded-full border px-3 py-1 ${unread !== '1' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}
        >
          Todas
        </Link>
        <Link
          href="/notifications?unread=1"
          className={`rounded-full border px-3 py-1 ${unread === '1' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}
        >
          Sin leer
        </Link>
      </nav>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">Sin notificaciones.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Card className={n.readAt ? 'opacity-70' : ''}>
                <CardBody className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm">{n.title}</strong>
                      {!n.readAt && <Badge variant="info">Nueva</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{n.body}</p>
                    <div className="mt-1 text-xs text-gray-500">{n.createdAt.toLocaleString()}</div>
                    {n.link && (
                      <Link href={n.link as never} className="mt-2 inline-block text-xs underline">
                        Ver detalle
                      </Link>
                    )}
                  </div>
                  {!n.readAt && (
                    <form action={markOneReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Marcar leído
                      </Button>
                    </form>
                  )}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
