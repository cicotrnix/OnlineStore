import type { Locale } from '@/lib/i18n'
import type { NotificationType } from '@prisma/client'
import { render } from '@react-email/render'
import type { JSX } from 'react'
import {
  ApprovalGrantedEmail,
  ApprovalRejectedEmail,
  ApprovalRequestedEmail,
  CreditBlockedEmail,
  CreditWarningEmail,
  CustomerApprovedEmail,
  CustomerRejectedEmail,
  InvoiceDueSoonEmail,
  InvoiceIssuedEmail,
  InvoiceOverdueEmail,
  InvoicePaidEmail,
  OrderPlacedEmail,
  PasswordResetEmail,
  PaymentCapturedEmail,
  PaymentReconciledEmail,
  QuoteAcceptedEmail,
  QuoteExpiringEmail,
  QuoteQuotedEmail,
  QuoteRejectedEmail,
  QuoteRevisedEmail,
  QuoteSubmittedEmail,
  ShipmentDispatchedEmail,
} from './templates'
import type { BaseTemplateProps } from './templates/_base'

export type RenderVars = BaseTemplateProps

const TEMPLATES: Record<NotificationType, (p: BaseTemplateProps) => JSX.Element> = {
  QUOTE_SUBMITTED: QuoteSubmittedEmail,
  QUOTE_QUOTED: QuoteQuotedEmail,
  QUOTE_REVISED: QuoteRevisedEmail,
  QUOTE_ACCEPTED: QuoteAcceptedEmail,
  QUOTE_REJECTED: QuoteRejectedEmail,
  QUOTE_EXPIRING: QuoteExpiringEmail,
  APPROVAL_REQUESTED: ApprovalRequestedEmail,
  APPROVAL_GRANTED: ApprovalGrantedEmail,
  APPROVAL_REJECTED: ApprovalRejectedEmail,
  INVOICE_DUE_SOON: InvoiceDueSoonEmail,
  INVOICE_OVERDUE: InvoiceOverdueEmail,
  INVOICE_PAID: InvoicePaidEmail,
  CREDIT_LIMIT_WARNING: CreditWarningEmail,
  CREDIT_BLOCKED: CreditBlockedEmail,
  ORDER_PLACED: OrderPlacedEmail,
  PAYMENT_CAPTURED: PaymentCapturedEmail,
  PAYMENT_RECONCILED: PaymentReconciledEmail,
  INVOICE_ISSUED: InvoiceIssuedEmail,
  SHIPMENT_DISPATCHED: ShipmentDispatchedEmail,
  CUSTOMER_APPROVED: CustomerApprovedEmail,
  CUSTOMER_REJECTED: CustomerRejectedEmail,
}

export async function renderEmailFor(
  type: NotificationType,
  vars: RenderVars,
  locale: Locale = 'en-US'
): Promise<string> {
  const Template = TEMPLATES[type]
  return render(Template({ ...vars, locale }))
}

/**
 * Render del email de reset de contraseña. Sale del flujo de auth (acción
 * síncrona), no del outbox de notificaciones, por eso tiene su propio render.
 */
export async function renderPasswordResetEmail(
  vars: RenderVars,
  locale: Locale = 'en-US'
): Promise<string> {
  return render(PasswordResetEmail({ ...vars, locale }))
}
