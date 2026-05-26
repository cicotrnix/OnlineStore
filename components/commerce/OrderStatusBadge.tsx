import { Badge } from '@/components/ui/Badge'

type Status = 'PENDING_PAYMENT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

const config: Record<
  Status,
  { variant: 'info' | 'warning' | 'success' | 'danger' | 'default'; label: string }
> = {
  PENDING_PAYMENT: { variant: 'warning', label: 'Pendiente de pago' },
  CONFIRMED: { variant: 'info', label: 'Confirmada' },
  SHIPPED: { variant: 'info', label: 'Enviada' },
  DELIVERED: { variant: 'success', label: 'Entregada' },
  CANCELLED: { variant: 'danger', label: 'Cancelada' },
}

export function OrderStatusBadge({ status }: { status: Status | string }) {
  const c = config[status as Status] ?? { variant: 'default' as const, label: status }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
