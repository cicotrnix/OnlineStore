import { describe, expect, it } from 'vitest'
import { EVENT_TYPES } from '../contract'

describe('event contract v1', () => {
  it('incluye los 12 eventos canónicos (v1 + customer.rejected del onboarding B2B)', () => {
    expect(EVENT_TYPES).toEqual([
      'customer.verified',
      'customer.rejected',
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
