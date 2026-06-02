import crypto from 'node:crypto'

/**
 * Firma HMAC sha256 sobre el body JSON. Receptor verifica con el mismo secret.
 * Header recomendado: `X-Webhook-Signature: sha256=<hex>`.
 */
export function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export function verifySignature(secret: string, body: string, sig: string): boolean {
  const expected = signPayload(secret, body)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
  } catch {
    return false
  }
}
