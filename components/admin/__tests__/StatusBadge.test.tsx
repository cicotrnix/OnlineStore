import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge, type StatusTone, toneFor } from '../StatusBadge'

describe('toneFor — mapeo estado→tono por dominio (enums completos)', () => {
  const cases: Array<[Parameters<typeof toneFor>[0], Record<string, StatusTone>]> = [
    [
      'order',
      {
        PENDING_PAYMENT: 'warning',
        PENDING_APPROVAL: 'warning',
        CONFIRMED: 'info',
        SHIPPED: 'info',
        DELIVERED: 'success',
        CANCELLED: 'danger',
      },
    ],
    [
      'quote',
      {
        DRAFT: 'neutral',
        SUBMITTED: 'warning',
        QUOTED: 'info',
        ACCEPTED: 'success',
        REJECTED: 'danger',
        EXPIRED: 'neutral',
      },
    ],
    ['invoice', { PENDING: 'warning', PAID: 'success', OVERDUE: 'danger', CANCELLED: 'neutral' }],
    ['approval', { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }],
    [
      'payment',
      {
        PENDING: 'warning',
        AUTHORIZED: 'info',
        CAPTURED: 'success',
        REFUND_PENDING: 'warning',
        REFUNDED: 'neutral',
        FAILED: 'danger',
        NEEDS_REVIEW: 'danger',
      },
    ],
  ]

  for (const [domain, map] of cases) {
    it(`${domain}: cada valor del enum mapea a su tono`, () => {
      for (const [status, tone] of Object.entries(map)) {
        expect(toneFor(domain, status)).toBe(tone)
      }
    })
  }

  it('estado desconocido → neutral', () => {
    expect(toneFor('order', 'WAT')).toBe('neutral')
  })
})

describe('StatusBadge render', () => {
  it('modo i18n: domain+status+locale → label traducido', () => {
    render(<StatusBadge domain="order" status="DELIVERED" locale="en-US" />)
    expect(screen.getByText('Delivered')).toBeDefined()
  })

  it('modo i18n ES', () => {
    render(<StatusBadge domain="invoice" status="PAID" locale="es-419" />)
    expect(screen.getByText('Pagada')).toBeDefined()
  })

  it('modo raw: tone+children', () => {
    render(<StatusBadge tone="danger">Boom</StatusBadge>)
    expect(screen.getByText('Boom')).toBeDefined()
  })
})
