import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { requireAuth } from '@/lib/auth/helpers'
import { ordersService } from '@/modules/orders'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/**
 * URL de éxito de Stripe Checkout. PSDD: NO confirmamos pago acá. El cliente
 * llega con success_url tras pagar; el estado real lo escribe el webhook
 * firmado. Mensaje: "procesando" hasta que el webhook flippea el order.status.
 */
export default async function PaymentPendingPage({ params }: Props) {
  await requireAuth()
  const { id } = await params
  const order = await ordersService.findById(id)
  if (!order) notFound()

  const confirmed = order.status === 'CONFIRMED' || order.status === 'SHIPPED' || order.status === 'DELIVERED'

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-medium">
            {confirmed ? '¡Gracias! Pago confirmado' : 'Procesando pago'}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Orden <span className="font-mono">{order.orderNumber}</span> ·{' '}
            <OrderStatusBadge status={order.status} />
          </p>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-gray-700">
          {confirmed ? (
            <p>
              Recibimos la confirmación del procesador. Te enviamos un email con el recibo
              y los próximos pasos. Pronto verás el tracking del envío acá.
            </p>
          ) : (
            <>
              <p>
                Recibimos tu pago en Stripe. Estamos esperando la confirmación firmada del
                procesador para acreditarlo en tu orden (suele tardar segundos).
              </p>
              <p>
                Podés refrescar esta página o volver al detalle de la orden en cualquier
                momento.
              </p>
            </>
          )}
          <Link href={`/orders/${order.id}`} className="inline-block underline">
            Volver al detalle de la orden
          </Link>
        </CardBody>
      </Card>
    </div>
  )
}
