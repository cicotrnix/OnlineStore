import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn()
const getSignedUrlMock = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock
  },
  PutObjectCommand: class {
    __type = 'PUT'
    input: unknown
    constructor(input: unknown) {
      this.input = input
    }
  },
  GetObjectCommand: class {
    __type = 'GET'
    input: unknown
    constructor(input: unknown) {
      this.input = input
    }
  },
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}))

const ORIG = { ...process.env }

beforeEach(() => {
  sendMock.mockReset()
  getSignedUrlMock.mockReset()
  vi.resetModules()
  // Limpiar env vars de R2 entre tests.
  for (const k of ['R2_BUCKET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    delete process.env[k]
  }
})

afterEach(() => {
  process.env = { ...ORIG }
})

describe('lib/storage — adapter selection', () => {
  it('sin env vars → cae al FakeStorage (noop-safe)', async () => {
    const { getStorage } = await import('../index')
    const c = getStorage()
    await c.put('a', 'hello')
    const back = await c.get('a')
    expect(new TextDecoder().decode(back!)).toBe('hello')
    const url = await c.signedUrl('a')
    expect(url).toMatch(/^fake:\/\//)
  })

  it('con las 4 env vars → instancia R2Storage', async () => {
    process.env.R2_BUCKET = 'pi-power-bucket'
    process.env.R2_ACCOUNT_ID = 'acc123'
    process.env.R2_ACCESS_KEY_ID = 'ak'
    process.env.R2_SECRET_ACCESS_KEY = 'sk'
    const { getStorage } = await import('../index')
    const c = getStorage()
    await c.put('certs/abc.pdf', new Uint8Array([1, 2, 3]), 'application/pdf')
    expect(sendMock).toHaveBeenCalledTimes(1)
    const cmd = sendMock.mock.calls[0]![0]
    expect(cmd.__type).toBe('PUT')
    expect(cmd.input.Bucket).toBe('pi-power-bucket')
    expect(cmd.input.Key).toBe('certs/abc.pdf')
    expect(cmd.input.ContentType).toBe('application/pdf')
  })

  it('R2Storage signedUrl invoca getSignedUrl del SDK con TTL', async () => {
    process.env.R2_BUCKET = 'b'
    process.env.R2_ACCOUNT_ID = 'a'
    process.env.R2_ACCESS_KEY_ID = 'k'
    process.env.R2_SECRET_ACCESS_KEY = 's'
    getSignedUrlMock.mockResolvedValue('https://r2.signed/url?sig=xyz')
    const { getStorage } = await import('../index')
    const c = getStorage()
    const url = await c.signedUrl('certs/abc.pdf', 600)
    expect(url).toBe('https://r2.signed/url?sig=xyz')
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1)
    const args = getSignedUrlMock.mock.calls[0]!
    expect(args[1].__type).toBe('GET')
    expect(args[1].input.Bucket).toBe('b')
    expect(args[2]).toEqual({ expiresIn: 600 })
  })

  it('si falta una sola env var → cae al Fake', async () => {
    process.env.R2_BUCKET = 'b'
    process.env.R2_ACCOUNT_ID = 'a'
    process.env.R2_ACCESS_KEY_ID = 'k'
    // SECRET_ACCESS_KEY missing
    const { getStorage } = await import('../index')
    const url = await getStorage().signedUrl('x')
    expect(url).toMatch(/^fake:\/\//)
  })
})
