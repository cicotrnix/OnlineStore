import { hashPassword, validatePasswordPolicy, verifyPassword } from '@/lib/auth/password'
import { describe, expect, it } from 'vitest'

describe('password', () => {
  it('hash + verify round-trip', async () => {
    const h = await hashPassword('Abcd1234')
    expect(h).not.toBe('Abcd1234')
    expect(await verifyPassword('Abcd1234', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
  it('policy: mínimo 8 + letra + número', () => {
    expect(validatePasswordPolicy('Abcd1234').ok).toBe(true)
    expect(validatePasswordPolicy('short1').ok).toBe(false)
    expect(validatePasswordPolicy('abcdefgh').ok).toBe(false)
    expect(validatePasswordPolicy('12345678').ok).toBe(false)
  })
})
