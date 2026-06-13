import { beforeEach, describe, expect, it, vi } from 'vitest'

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }))
vi.mock('@/lib/db/client', () => ({ prisma: { aiUsage: { upsert } } }))

import { currentPeriodYm, isOverBudget, recordUsage } from '../budget'

function p2002() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
}

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

describe('recordUsage retry-on-P2002', () => {
  beforeEach(() => {
    upsert.mockReset()
  })

  it('reintenta tras P2002 y no lanza (el 2º intento va por update)', async () => {
    upsert.mockRejectedValueOnce(p2002()).mockResolvedValueOnce(undefined)
    await expect(recordUsage(100)).resolves.toBeUndefined()
    expect(upsert).toHaveBeenCalledTimes(2)
  })

  it('happy path: un solo upsert', async () => {
    upsert.mockResolvedValueOnce(undefined)
    await recordUsage(50)
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('propaga errores que NO son P2002', async () => {
    upsert.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'P9999' }))
    await expect(recordUsage(10)).rejects.toThrow(/boom/)
  })
})
