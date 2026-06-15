import { describe, expect, it } from 'vitest'
import { hasBlockingIssue } from './service'

describe('hasBlockingIssue', () => {
  it('inactive bloquea', () => {
    expect(hasBlockingIssue(['inactive'])).toBe(true)
  })
  it('insufficient-stock bloquea', () => {
    expect(hasBlockingIssue(['insufficient-stock'])).toBe(true)
  })
  it('price-changed NO bloquea (se informa, no impide confirmar)', () => {
    expect(hasBlockingIssue(['price-changed'])).toBe(false)
  })
  it('empty NO bloquea', () => {
    expect(hasBlockingIssue(['empty'])).toBe(false)
  })
  it('sin issues → false', () => {
    expect(hasBlockingIssue([])).toBe(false)
  })
  it('mezcla con uno bloqueante → true', () => {
    expect(hasBlockingIssue(['price-changed', 'inactive'])).toBe(true)
  })
})
