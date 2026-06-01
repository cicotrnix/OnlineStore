/**
 * Object storage abstraction. Producción: R2/S3 con SDK; dev/test/CI: in-memory Fake.
 * Configurable via env STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY,
 * STORAGE_ENDPOINT. Sin claves → cae al Fake noop-safe.
 */
export interface StorageClient {
  put(key: string, body: Uint8Array | string, contentType?: string): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  signedUrl(key: string, ttlSeconds?: number): Promise<string>
}

class FakeStorage implements StorageClient {
  private store = new Map<string, Uint8Array>()

  async put(key: string, body: Uint8Array | string): Promise<void> {
    const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
    this.store.set(key, bytes)
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.store.get(key) ?? null
  }

  async signedUrl(key: string): Promise<string> {
    return `fake://${key}`
  }
}

const fakeSingleton = new FakeStorage()

export function getStorage(): StorageClient {
  // Si en el futuro hay credenciales R2/S3, instanciar el cliente real acá.
  // Por ahora: siempre Fake (noop-safe). Mantenemos el contrato listo.
  return fakeSingleton
}

export function _resetFakeStorage(): void {
  ;(fakeSingleton as unknown as { store: Map<string, Uint8Array> }).store.clear()
}
