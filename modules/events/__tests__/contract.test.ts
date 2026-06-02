import { describe, expect, it } from 'vitest'
import { EVENT_TYPES } from '../contract'

describe('event contract v1', () => {
  it('incluye los 11 eventos canónicos', () => {
    expect(EVENT_TYPES).toEqual([
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
    ])
  })
})
