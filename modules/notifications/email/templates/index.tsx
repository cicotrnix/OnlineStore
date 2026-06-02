import type { JSX } from 'react'
import { BaseTemplate, type BaseTemplateProps } from './_base'

function make(cta: string) {
  return function Template(props: BaseTemplateProps): JSX.Element {
    return <BaseTemplate {...props} cta={cta} />
  }
}

export const QuoteSubmittedEmail = make('Ver solicitud')
export const QuoteQuotedEmail = make('Ver cotización')
export const QuoteRevisedEmail = make('Ver cotización revisada')
export const QuoteAcceptedEmail = make('Ver orden')
export const QuoteRejectedEmail = make('Ver detalles')
export const QuoteExpiringEmail = make('Aceptar antes que venza')
export const ApprovalRequestedEmail = make('Decidir aprobación')
export const ApprovalGrantedEmail = make('Ver orden')
export const ApprovalRejectedEmail = make('Ver detalles')
export const InvoiceDueSoonEmail = make('Ver factura')
export const InvoiceOverdueEmail = make('Pagar factura')
export const InvoicePaidEmail = make('Ver factura')
export const CreditWarningEmail = make('Ver cuenta')
export const CreditBlockedEmail = make('Ver cuenta')

// Fase 5 Corte 5: outbox-driven (disparados por bus de eventos)
export const OrderPlacedEmail = make('Ver orden')
export const PaymentCapturedEmail = make('Ver recibo')
export const PaymentReconciledEmail = make('Ver recibo')
export const InvoiceIssuedEmail = make('Pagar via wire')
export const ShipmentDispatchedEmail = make('Rastrear envío')

// Onboarding B2B (2026-06-02): aprobación / rechazo manual del admin.
export const CustomerApprovedEmail = make('Ver catálogo con precios')
export const CustomerRejectedEmail = make('Revisar y re-enviar')
