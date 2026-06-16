import { StatusBadge } from '@/components/admin/StatusBadge'
import { type Locale, t } from '@/lib/i18n/messages'

export type PaymentBadgeStatus = 'CAPTURED' | 'PENDING' | null

interface Props {
  paymentStatus: PaymentBadgeStatus
  locale: Locale
}

// Wrapper fino sobre StatusBadge (modo raw): conserva la firma existente
// `{paymentStatus, locale}` → cero cambio en los call-sites de Cuenta.
export function PaymentBadge({ paymentStatus, locale }: Props) {
  if (!paymentStatus) return null
  const isPaid = paymentStatus === 'CAPTURED'
  const label = isPaid ? t(locale, 'payment.status.paid') : t(locale, 'payment.status.pending')
  return <StatusBadge tone={isPaid ? 'success' : 'warning'}>{label}</StatusBadge>
}
