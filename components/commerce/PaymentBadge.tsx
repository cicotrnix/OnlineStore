import type { Locale } from '@/lib/i18n/messages'

export type PaymentBadgeStatus = 'CAPTURED' | 'PENDING' | null

interface Props {
  paymentStatus: PaymentBadgeStatus
  locale: Locale
}

// TODO Task 5: replace hardcoded labels with t(locale, 'payment.status.paid' | 'payment.status.pending').
const LABELS: Record<'paid' | 'pending', Record<Locale, string>> = {
  paid: { 'en-US': 'Paid', 'es-419': 'Pagado' },
  pending: { 'en-US': 'Payment pending', 'es-419': 'Pendiente de pago' },
}

export function PaymentBadge({ paymentStatus, locale }: Props) {
  if (!paymentStatus) return null
  const isPaid = paymentStatus === 'CAPTURED'
  const label = isPaid ? LABELS.paid[locale] : LABELS.pending[locale]
  const className = isPaid
    ? 'inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20'
    : 'inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20'
  return <span className={className}>{label}</span>
}
