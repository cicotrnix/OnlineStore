import { t } from '@/lib/i18n/messages'
import type { Locale } from '@/lib/i18n/messages'

export type PaymentBadgeStatus = 'CAPTURED' | 'PENDING' | null

interface Props {
  paymentStatus: PaymentBadgeStatus
  locale: Locale
}

export function PaymentBadge({ paymentStatus, locale }: Props) {
  if (!paymentStatus) return null
  const isPaid = paymentStatus === 'CAPTURED'
  const label = isPaid ? t(locale, 'payment.status.paid') : t(locale, 'payment.status.pending')
  const className = isPaid
    ? 'inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20'
    : 'inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20'
  return <span className={className}>{label}</span>
}
