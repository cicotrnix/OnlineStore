import { describe, expect, it } from 'vitest'
import { mergeRankings } from '../rrf'

describe('rrf.mergeRankings', () => {
  it('merges two non-overlapping rankings', () => {
    const result = mergeRankings(['a', 'b', 'c'], ['x', 'y', 'z'], 60)
    expect(result).toHaveLength(6)
    expect(result[0]?.id).toBe('a')
  })

  it('boosts items in both rankings', () => {
    const result = mergeRankings(['a', 'b', 'c'], ['c', 'a', 'd'], 60)
    expect(result[0]?.id).toBe('a')
    expect(result[1]?.id).toBe('c')
  })

  it('handles empty lists', () => {
    expect(mergeRankings([], [], 60)).toEqual([])
    expect(mergeRankings(['a'], [], 60)).toHaveLength(1)
    expect(mergeRankings([], ['x'], 60)).toHaveLength(1)
  })

  it('uses configurable k', () => {
    const r1 = mergeRankings(['a'], ['a'], 1)
    const r60 = mergeRankings(['a'], ['a'], 60)
    expect(r1[0]?.score).toBeGreaterThan(r60[0]?.score ?? 0)
  })
})
