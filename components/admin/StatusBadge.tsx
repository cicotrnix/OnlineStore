import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import type { ReactNode } from 'react'

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'
export type StatusDomain = 'order' | 'quote' | 'invoice' | 'approval' | 'payment'

/**
 * Mapeo estado→tono por dominio. Cubre el enum COMPLETO de cada uno (incl.
 * QuoteStatus.EXPIRED y PaymentStatus.FAILED/NEEDS_REVIEW). Estado desconocido
 * cae a 'neutral'.
 */
const TONE_MAP: Record<StatusDomain, Record<string, StatusTone>> = {
  order: {
    PENDING_PAYMENT: 'warning',
    PENDING_APPROVAL: 'warning',
    CONFIRMED: 'info',
    SHIPPED: 'info',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  },
  quote: {
    DRAFT: 'neutral',
    SUBMITTED: 'warning',
    QUOTED: 'info',
    ACCEPTED: 'success',
    REJECTED: 'danger',
    EXPIRED: 'neutral',
  },
  invoice: { PENDING: 'warning', PAID: 'success', OVERDUE: 'danger', CANCELLED: 'neutral' },
  approval: { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' },
  payment: {
    PENDING: 'warning',
    AUTHORIZED: 'info',
    CAPTURED: 'success',
    REFUND_PENDING: 'warning',
    REFUNDED: 'neutral',
    FAILED: 'danger',
    NEEDS_REVIEW: 'danger',
  },
}

export function toneFor(domain: StatusDomain, status: string): StatusTone {
  return TONE_MAP[domain][status] ?? 'neutral'
}

// Estado comunicado por texto + color (punto + label), nunca solo color (a11y).
const TONE_CLASS: Record<StatusTone, { dot: string; text: string }> = {
  neutral: { dot: 'bg-ink-300', text: 'text-ink-500' },
  info: { dot: 'bg-sky-500', text: 'text-sky-700' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-700' },
  success: { dot: 'bg-lime-deep', text: 'text-lime-deep' },
  danger: { dot: 'bg-red-500', text: 'text-red-700' },
}

type Props =
  | { domain: StatusDomain; status: string; locale: Locale; tone?: never; children?: never }
  | { tone: StatusTone; children: ReactNode; domain?: never; status?: never; locale?: never }

/**
 * Celda de estado unificada (Back-to-100%). Dos modos:
 *  - i18n: `<StatusBadge domain="order" status="CONFIRMED" locale={locale} />`
 *  - raw:  `<StatusBadge tone="success">Label</StatusBadge>` (lo usan los
 *    wrappers OrderStatusBadge/PaymentBadge para no cambiar sus call-sites).
 */
export function StatusBadge(props: Props) {
  const isI18n = 'domain' in props && props.domain !== undefined
  const tone = isI18n ? toneFor(props.domain, props.status) : props.tone
  const label: ReactNode = isI18n
    ? t(props.locale, `status.${props.domain}.${props.status}` as MessageKey)
    : props.children
  const c = TONE_CLASS[tone]

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} aria-hidden />
      <span className={c.text}>{label}</span>
    </span>
  )
}
