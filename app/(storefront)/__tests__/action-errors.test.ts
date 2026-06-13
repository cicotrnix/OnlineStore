// CAL-1 (auditoría 2026-06-12): los catches mudos de cart/checkout mapean
// errores tipados a message keys específicas en vez del genérico *.failed.
import { EmptyCartError, InsufficientStockError, ProductInactiveError } from '@/modules/orders'
import { describe, expect, it } from 'vitest'
import { cartErrorKey, checkoutErrorKey } from '../_action-errors'

describe('checkoutErrorKey', () => {
  it('InsufficientStockError → checkout.toast.insufficientStock', () => {
    expect(checkoutErrorKey(new InsufficientStockError('p', 1, 5))).toBe(
      'checkout.toast.insufficientStock'
    )
  })
  it('ProductInactiveError → checkout.toast.inactive', () => {
    expect(checkoutErrorKey(new ProductInactiveError('p'))).toBe('checkout.toast.inactive')
  })
  it('EmptyCartError → checkout.toast.empty', () => {
    expect(checkoutErrorKey(new EmptyCartError())).toBe('checkout.toast.empty')
  })
  it('ORG_NOT_VERIFIED → checkout.toast.notVerified', () => {
    expect(checkoutErrorKey(new Error('ORG_NOT_VERIFIED'))).toBe('checkout.toast.notVerified')
  })
  it('error desconocido → checkout.toast.failed', () => {
    expect(checkoutErrorKey(new Error('boom'))).toBe('checkout.toast.failed')
    expect(checkoutErrorKey('weird')).toBe('checkout.toast.failed')
  })
})

describe('cartErrorKey', () => {
  it('InsufficientStockError → cart.toast.insufficientStock', () => {
    expect(cartErrorKey(new InsufficientStockError('p', 1, 5))).toBe('cart.toast.insufficientStock')
  })
  it('ORG_NOT_VERIFIED → cart.toast.notVerified', () => {
    expect(cartErrorKey(new Error('ORG_NOT_VERIFIED'))).toBe('cart.toast.notVerified')
  })
  it('error desconocido → cart.toast.failed', () => {
    expect(cartErrorKey(new Error('boom'))).toBe('cart.toast.failed')
  })
})
