import { createHash, randomBytes } from 'node:crypto'

/** TTL del token de reset: 1 hora. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

/** Token CRUDO aleatorio (32 bytes → 64 hex). Viaja solo en el email. */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/** Hash SHA-256 (hex) del token crudo. En DB se guarda el hash, nunca el crudo. */
export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
