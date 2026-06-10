import bcrypt from 'bcryptjs'

const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export interface PolicyResult {
  ok: boolean
  reason?: string
}

/** Gate mínimo: ≥8, al menos una letra y un número. (El medidor de UI es más exigente.) */
export function validatePasswordPolicy(plain: string): PolicyResult {
  if (plain.length < 8) return { ok: false, reason: 'minLength' }
  if (!/[a-zA-Z]/.test(plain)) return { ok: false, reason: 'needsLetter' }
  if (!/[0-9]/.test(plain)) return { ok: false, reason: 'needsNumber' }
  return { ok: true }
}

/** Hash dummy para comparación anti-timing cuando el usuario no existe. */
export const DUMMY_HASH = bcrypt.hashSync('dummy-anti-timing-value', COST)
