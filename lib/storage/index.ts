/**
 * Object storage abstraction. Producción: R2 (S3-compatible) con AWS SDK;
 * dev/test/CI: in-memory Fake.
 *
 * Env vars (todas requeridas para activar el cliente real):
 *   R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *
 * Sin las cuatro → FakeStorage (noop-safe). Garantiza que el deploy sigue
 * inerte sin claves.
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

/**
 * Cliente R2 (Cloudflare) — endpoint S3-compatible. Mismo contrato que
 * FakeStorage. Solo se instancia si las 4 env vars están presentes.
 */
class R2Storage implements StorageClient {
  private s3: S3Client
  constructor(
    private readonly bucket: string,
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async put(key: string, body: Uint8Array | string, contentType?: string): Promise<void> {
    const Body = typeof body === 'string' ? new TextEncoder().encode(body) : body
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body,
        ContentType: contentType,
      })
    )
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      const stream = res.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined
      if (!stream?.transformToByteArray) return null
      return await stream.transformToByteArray()
    } catch {
      return null
    }
  }

  async signedUrl(key: string, ttlSeconds = 900): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSeconds,
    })
  }
}

let cached: StorageClient | null = null
const fakeSingleton = new FakeStorage()

export function getStorage(): StorageClient {
  if (cached) return cached
  const bucket = process.env.R2_BUCKET
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (bucket && accountId && accessKeyId && secretAccessKey) {
    cached = new R2Storage(bucket, accountId, accessKeyId, secretAccessKey)
  } else {
    cached = fakeSingleton
  }
  return cached
}

/** Solo para tests. */
export function _resetFakeStorage(): void {
  ;(fakeSingleton as unknown as { store: Map<string, Uint8Array> }).store.clear()
  cached = null
}

/** Solo para tests: fuerza el client (mock o Fake). */
export function _setStorageClient(client: StorageClient | null): void {
  cached = client
}
