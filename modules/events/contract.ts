/** Contrato de eventos de dominio v1 (inmutable, versionado). */
export const EVENT_TYPES = [
  'customer.verified',
  'order.placed',
  'payment.authorized',
  'payment.captured',
  'payment.reconciled',
  'payment.refunded',
  'payment.failed',
  'shipment.dispatched',
  'invoice.issued',
  'invoice.paid',
  'invoice.overdue',
] as const

export type DomainEventType = (typeof EVENT_TYPES)[number]

/** Entrada para emitir un evento (lo que produce el dominio). */
export interface DomainEventInput {
  type: DomainEventType
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
}

/** Evento materializado que recibe un suscriptor. */
export interface DomainEventRecord {
  id: string
  type: DomainEventType
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  occurredAt: Date
}
