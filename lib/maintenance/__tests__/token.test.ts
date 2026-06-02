import { describe, expect, it } from 'vitest'
import { computeBypassToken, verifyBypassToken } from '../token'

describe('maintenance bypass token', () => {
  it('verifica token válido bajo el mismo secret', async () => {
    const secret = 'topsecret-key-123'
    const token = await computeBypassToken(secret)
    expect(await verifyBypassToken(secret, token)).toBe(true)
  })

  it('rechaza token bajo secret distinto (rotación invalida cookies)', async () => {
    const token = await computeBypassToken('old-secret')
    expect(await verifyBypassToken('new-secret', token)).toBe(false)
  })

  it('rechaza secret/cookie undefined o vacío', async () => {
    expect(await verifyBypassToken(undefined, 'whatever')).toBe(false)
    expect(await verifyBypassToken('secret', undefined)).toBe(false)
    expect(await verifyBypassToken('secret', '')).toBe(false)
  })

  it('rechaza token tampered (mismo largo, distinto contenido)', async () => {
    const secret = 'k'
    const real = await computeBypassToken(secret)
    const fake = real.slice(0, -1) + (real.slice(-1) === 'A' ? 'B' : 'A')
    expect(await verifyBypassToken(secret, fake)).toBe(false)
  })
})
