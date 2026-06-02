/**
 * Genera/verifica el token de bypass para el modo mantenimiento.
 * Edge-safe (usa Web Crypto, sin node:crypto). El token es un HMAC de un
 * literal fijo bajo `MAINTENANCE_BYPASS_KEY`; si la key rota, todos los
 * cookies emitidos quedan inválidos automáticamente.
 */

const PAYLOAD = 'maint-bypass-v1'

function bufToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    if (b !== undefined) bin += String.fromCharCode(b)
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function computeBypassToken(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(PAYLOAD))
  return bufToBase64url(sig)
}

export async function verifyBypassToken(
  secret: string | undefined,
  cookieValue: string | undefined
): Promise<boolean> {
  if (!secret || !cookieValue) return false
  const expected = await computeBypassToken(secret)
  // Comparación timing-safe manual (ambos strings son base64url del mismo
  // largo cuando ambos derivan del mismo algoritmo).
  if (expected.length !== cookieValue.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ cookieValue.charCodeAt(i)
  }
  return diff === 0
}

export const BYPASS_COOKIE_NAME = 'maint_bypass'
