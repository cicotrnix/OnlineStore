// Runtime React binding (ver _base.tsx): sin esto el render del cron tsx tira
// "React is not defined" porque el JSX usa el transform clásico.
// biome-ignore lint/correctness/noUnusedImports: binding de runtime del transform clásico — el render lo usa aunque no se referencie explícito (biome asume runtime automático).
import * as React from 'react'
import type { JSX } from 'react'
import { BaseTemplate, type BaseTemplateProps } from './_base'

/**
 * Helper que crea un template con CTA por locale. Si el locale del destinatario
 * no está en el mapa, cae al CTA en inglés.
 */
function make(cta: { en: string; es: string }) {
  return function Template(props: BaseTemplateProps): JSX.Element {
    const localized = props.locale === 'es-419' ? cta.es : cta.en
    return <BaseTemplate {...props} cta={localized} />
  }
}

export const QuoteSubmittedEmail = make({ en: 'View request', es: 'Ver solicitud' })
export const QuoteQuotedEmail = make({ en: 'View quote', es: 'Ver cotización' })
export const QuoteRevisedEmail = make({ en: 'View revised quote', es: 'Ver cotización revisada' })
export const QuoteAcceptedEmail = make({ en: 'View order', es: 'Ver orden' })
export const QuoteRejectedEmail = make({ en: 'View details', es: 'Ver detalles' })
export const QuoteExpiringEmail = make({
  en: 'Accept before it expires',
  es: 'Aceptar antes que venza',
})
export const ApprovalRequestedEmail = make({
  en: 'Decide approval',
  es: 'Decidir aprobación',
})
export const ApprovalGrantedEmail = make({ en: 'View order', es: 'Ver orden' })
export const ApprovalRejectedEmail = make({ en: 'View details', es: 'Ver detalles' })
export const InvoiceDueSoonEmail = make({ en: 'View invoice', es: 'Ver factura' })
export const InvoiceOverdueEmail = make({ en: 'Pay invoice', es: 'Pagar factura' })
export const InvoicePaidEmail = make({ en: 'View invoice', es: 'Ver factura' })
export const CreditWarningEmail = make({ en: 'View account', es: 'Ver cuenta' })
export const CreditBlockedEmail = make({ en: 'View account', es: 'Ver cuenta' })

// ORDER_PLACED lleva un CTA secundario "Volver a pedir" → el mismo detalle del
// pedido (/orders/[id]), donde está el botón in-app. El email NO ejecuta la
// acción; solo lleva al botón.
export function OrderPlacedEmail(props: BaseTemplateProps): JSX.Element {
  const es = props.locale === 'es-419'
  return (
    <BaseTemplate
      {...props}
      cta={es ? 'Ver orden' : 'View order'}
      secondaryCta={es ? 'Volver a pedir' : 'Reorder'}
      secondaryLink={props.link}
    />
  )
}
export const PaymentCapturedEmail = make({ en: 'View receipt', es: 'Ver recibo' })
export const PaymentReconciledEmail = make({ en: 'View receipt', es: 'Ver recibo' })
export const InvoiceIssuedEmail = make({ en: 'Pay via wire', es: 'Pagar via wire' })
export const ShipmentDispatchedEmail = make({ en: 'Track shipment', es: 'Rastrear envío' })
export const CustomerApprovedEmail = make({ en: 'Browse catalog', es: 'Ver catálogo' })
export const CustomerRejectedEmail = make({ en: 'Resubmit certificate', es: 'Volver a enviar' })

// Email de reset de contraseña (auth, no es un NotificationType del outbox).
export const PasswordResetEmail = make({ en: 'Reset password', es: 'Restablecer contraseña' })
