import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { RESET_TOKEN_TTL_MS, generateResetToken, hashResetToken } from '../password-reset'

describe('password-reset token helpers', () => {
  it('hashResetToken: SHA-256 hex determinista', () => {
    const h = hashResetToken('abc')
    expect(h).toBe(createHash('sha256').update('abc').digest('hex'))
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generateResetToken: 64 hex, distinto cada vez (≥32 bytes)', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(a).not.toBe(b)
  })

  it('el hash del crudo es lo que se guardaría en DB (nunca el crudo)', () => {
    const raw = generateResetToken()
    expect(hashResetToken(raw)).not.toBe(raw)
  })

  it('TTL = 1 hora', () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000)
  })
})
