import { describe, expect, it } from 'vitest'
import { deriveChips, deriveStockState, isOrderable } from '../product-display'

describe('deriveStockState', () => {
  it('stock>0 sin flags → in_stock', () => {
    expect(deriveStockState(10, null)).toBe('in_stock')
  })
  it('incoming flag → incoming', () => {
    expect(deriveStockState(0, { incoming: true })).toBe('incoming')
  })
  it('coming_soon flag → coming_soon', () => {
    expect(deriveStockState(0, { coming_soon: true })).toBe('coming_soon')
  })
  it('stock 0 sin flags → out_of_stock', () => {
    expect(deriveStockState(0, {})).toBe('out_of_stock')
  })
  it('coming_soon precede al stock disponible', () => {
    expect(deriveStockState(5, { coming_soon: true })).toBe('coming_soon')
  })
})

describe('isOrderable', () => {
  it('solo in_stock es ordenable', () => {
    expect(isOrderable('in_stock')).toBe(true)
    expect(isOrderable('incoming')).toBe(false)
    expect(isOrderable('coming_soon')).toBe(false)
    expect(isOrderable('out_of_stock')).toBe(false)
  })
})

describe('deriveChips', () => {
  it('siempre incluye el sello', () => {
    expect(deriveChips({}).map((c) => c.key)).toContain('seal')
  })
  it('spot_welding_required → spotWeld', () => {
    expect(
      deriveChips({ attributes: { spot_welding_required: true } }).map((c) => c.key)
    ).toContain('spotWeld')
  })
  it('plug_and_play → plugAndPlay', () => {
    expect(deriveChips({ attributes: { plug_and_play: true } }).map((c) => c.key)).toContain(
      'plugAndPlay'
    )
  })
  it('flex_programmed → flexProgrammed', () => {
    expect(deriveChips({ attributes: { flex_programmed: true } }).map((c) => c.key)).toContain(
      'flexProgrammed'
    )
  })
  it('categoría tag-on-flex → tagOn (por categoría, no por nombre)', () => {
    expect(deriveChips({ categorySlug: 'tag-on-flex' }).map((c) => c.key)).toContain('tagOn')
  })
  it('sin attributes ni categoría especial → solo el sello', () => {
    expect(deriveChips({}).map((c) => c.key)).toEqual(['seal'])
  })
  it('capacity real → chip capacity con value (FU-010 gate)', () => {
    const cap = deriveChips({ attributes: { capacity: '10%' } }).find((c) => c.key === 'capacity')
    expect(cap?.value).toBe('10%')
  })
  it('sin capacity → no hay chip capacity', () => {
    expect(
      deriveChips({ attributes: { spot_welding_required: true } }).map((c) => c.key)
    ).not.toContain('capacity')
  })
})
