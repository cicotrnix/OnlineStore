import { describe, expect, it } from 'vitest'
import { currentPeriodYm, isOverBudget } from '../budget'

describe('budget pure logic', () => {
  it('currentPeriodYm da YYYY-MM', () => {
    expect(currentPeriodYm(new Date('2026-05-30T00:00:00Z'))).toBe('2026-05')
  })
  it('isOverBudget true cuando used >= budget', () => {
    expect(isOverBudget(1000, 1000)).toBe(true)
    expect(isOverBudget(1001, 1000)).toBe(true)
    expect(isOverBudget(999, 1000)).toBe(false)
  })
  it('isOverBudget false cuando budget es 0/ausente (sin límite)', () => {
    expect(isOverBudget(999999, 0)).toBe(false)
  })
})
