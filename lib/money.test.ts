import { Decimal } from '@prisma/client/runtime/library'
import { describe, expect, it } from 'vitest'
import { addMoney, formatMoney, isPositiveMoney, multiplyMoney } from './money'

describe('formatMoney', () => {
  it('formats integer USD', () => {
    expect(formatMoney(new Decimal('25.00'), 'USD')).toBe('$25.00')
  })

  it('formats decimal USD', () => {
    expect(formatMoney(new Decimal('25.50'), 'USD')).toBe('$25.50')
  })

  it('formats large amount with thousand separators', () => {
    expect(formatMoney(new Decimal('12345.67'), 'USD')).toBe('$12,345.67')
  })
})

describe('addMoney', () => {
  it('adds two decimals correctly', () => {
    const result = addMoney(new Decimal('10.10'), new Decimal('20.20'))
    expect(result.toString()).toBe('30.3')
  })

  it('returns 0 when no args', () => {
    expect(addMoney().toString()).toBe('0')
  })

  it('sums many', () => {
    const result = addMoney(new Decimal('1.10'), new Decimal('2.20'), new Decimal('3.30'))
    expect(result.toString()).toBe('6.6')
  })
})

describe('multiplyMoney', () => {
  it('multiplies decimal by integer', () => {
    const result = multiplyMoney(new Decimal('12.50'), 3)
    expect(result.toString()).toBe('37.5')
  })

  it('multiplies by zero', () => {
    expect(multiplyMoney(new Decimal('99.99'), 0).toString()).toBe('0')
  })
})

describe('isPositiveMoney', () => {
  it('returns true for positive', () => {
    expect(isPositiveMoney(new Decimal('0.01'))).toBe(true)
  })

  it('returns false for zero', () => {
    expect(isPositiveMoney(new Decimal('0'))).toBe(false)
  })

  it('returns false for negative', () => {
    expect(isPositiveMoney(new Decimal('-1'))).toBe(false)
  })
})
