// Decisión 3 (ADR 0038): el guard append-only NO se puede desactivar en
// producción. APPEND_ONLY_GUARD=off solo aplica fuera de producción (tests).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendOnlyEnforced } from '../client'

afterEach(() => vi.unstubAllEnvs())

describe('appendOnlyEnforced', () => {
  it('se mantiene activo en producción aunque APPEND_ONLY_GUARD=off', () => {
    expect(appendOnlyEnforced('production', 'off')).toBe(true)
  })

  it('permite desactivarlo fuera de producción (cleanDb en tests)', () => {
    expect(appendOnlyEnforced('test', 'off')).toBe(false)
    expect(appendOnlyEnforced('development', 'off')).toBe(false)
  })

  it('está activo cuando APPEND_ONLY_GUARD no es "off" (default), en cualquier entorno', () => {
    vi.stubEnv('APPEND_ONLY_GUARD', '') // sin desactivar
    expect(appendOnlyEnforced('production')).toBe(true)
    expect(appendOnlyEnforced('test')).toBe(true)
  })
})
