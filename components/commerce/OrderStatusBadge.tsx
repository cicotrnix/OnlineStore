import { StatusBadge, type StatusTone } from '@/components/admin/StatusBadge'

type Status = 'PENDING_PAYMENT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

// Wrapper fino sobre StatusBadge (modo raw): conserva la firma `{status}` (sin
// locale) que usan las pantallas de Cuenta → cero cambio en esos call-sites.
const config: Record<Status, { tone: StatusTone; label: string }> = {
  PENDING_PAYMENT: { tone: 'warning', label: 'Pendiente de pago' },
  CONFIRMED: { tone: 'info', label: 'Confirmada' },
  SHIPPED: { tone: 'info', label: 'Enviada' },
  DELIVERED: { tone: 'success', label: 'Entregada' },
  CANCELLED: { tone: 'danger', label: 'Cancelada' },
}

export function OrderStatusBadge({ status }: { status: Status | string }) {
  const c = config[status as Status] ?? { tone: 'neutral' as const, label: status }
  return <StatusBadge tone={c.tone}>{c.label}</StatusBadge>
}
