/**
 * READ-ONLY. Diagnóstico de entrega de los últimos eventos payment.captured.
 * Para cada uno: DomainEvent.status + sus EventDelivery (subscriber, status,
 * attempts, lastError). Sirve para confirmar si un payment.captured (ej. el de
 * ORD-2026-000010) quedó atascado en PROCESSING o si su delivery 'email' falló.
 *
 * Uso (terminal del container en Coolify):
 *   pnpm tsx scripts/debug-payment-captured.ts
 *
 * No escribe nada: sólo SELECTs.
 */
import { prisma } from '@/lib/db/client'

const TAKE = 20

async function main() {
  const events = await prisma.domainEvent.findMany({
    where: { type: 'payment.captured' },
    orderBy: { occurredAt: 'desc' },
    take: TAKE,
    include: { deliveries: true },
  })

  if (events.length === 0) {
    console.log('No hay eventos payment.captured.')
    return
  }

  // Resolver orderNumber desde payload.orderId (para identificar ORD-2026-000010).
  const orderIds = [
    ...new Set(
      events
        .map((e) => String((e.payload as Record<string, unknown>).orderId ?? ''))
        .filter((id) => id.length > 0)
    ),
  ]
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, orderNumber: true },
  })
  const orderNumberById = new Map(orders.map((o) => [o.id, o.orderNumber]))

  // Notification PAYMENT_CAPTURED del comprador (subjectId = payment.id =
  // event.aggregateId). Muestra si el email se envió o por qué falló (delivery
  // DONE no garantiza envío: dispatch traga el error de Resend).
  const aggregateIds = events.map((e) => e.aggregateId)
  const notifs = await prisma.notification.findMany({
    where: { type: 'PAYMENT_CAPTURED', subjectId: { in: aggregateIds } },
    include: { user: { select: { email: true } } },
  })
  const notifsBySubject = new Map<string, typeof notifs>()
  for (const n of notifs) {
    const key = n.subjectId ?? ''
    const arr = notifsBySubject.get(key) ?? []
    arr.push(n)
    notifsBySubject.set(key, arr)
  }

  console.log(`Últimos ${events.length} eventos payment.captured (más reciente primero):\n`)
  for (const e of events) {
    const orderId = String((e.payload as Record<string, unknown>).orderId ?? '')
    console.log('────────────────────────────────────────────────────────')
    console.log(`event.id     : ${e.id}`)
    console.log(`order        : ${orderNumberById.get(orderId) ?? (orderId || '(sin orderId)')}`)
    console.log(`occurredAt   : ${e.occurredAt.toISOString()}`)
    console.log(`EVENT.status : ${e.status}`)
    if (e.deliveries.length === 0) {
      console.log('deliveries   : (ninguna — el evento nunca se dispatchó)')
    } else {
      for (const d of e.deliveries) {
        console.log(
          `  delivery[${d.subscriber}] status=${d.status} attempts=${d.attempts} lastError=${d.lastError ?? '-'}`
        )
      }
    }
    const ns = notifsBySubject.get(e.aggregateId) ?? []
    if (ns.length === 0) {
      console.log('notification : (ninguna PAYMENT_CAPTURED para este pago)')
    } else {
      for (const n of ns) {
        console.log(
          `  notif[${n.userId}] email=${n.user.email} emailSentAt=${n.emailSentAt?.toISOString() ?? 'NULL'} emailFailedReason=${n.emailFailedReason ?? '-'}`
        )
      }
    }
  }
}

main()
  .catch((err) => {
    console.error('debug-payment-captured failed', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
