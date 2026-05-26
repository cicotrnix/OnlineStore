import type { NotificationType } from '@prisma/client'
import { render } from '@react-email/render'
import type { JSX } from 'react'
import {
  ApprovalGrantedEmail,
  ApprovalRejectedEmail,
  ApprovalRequestedEmail,
  CreditBlockedEmail,
  CreditWarningEmail,
  InvoiceDueSoonEmail,
  InvoiceOverdueEmail,
  InvoicePaidEmail,
  QuoteAcceptedEmail,
  QuoteExpiringEmail,
  QuoteQuotedEmail,
  QuoteRejectedEmail,
  QuoteRevisedEmail,
  QuoteSubmittedEmail,
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
}

export async function renderEmailFor(type: NotificationType, vars: RenderVars): Promise<string> {
  const Template = TEMPLATES[type]
  return render(Template(vars))
}
