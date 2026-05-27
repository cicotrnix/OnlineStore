import { beforeEach, describe, expect, it, vi } from 'vitest'
import { embedDocument, embedQuery, isVoyageEnabled } from './voyage'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('voyage', () => {
  it('isVoyageEnabled false when VOYAGE_API_KEY missing', () => {
    vi.stubEnv('VOYAGE_API_KEY', '')
    expect(isVoyageEnabled()).toBe(false)
    vi.unstubAllEnvs()
  })

  it('embedQuery returns vector on success', async () => {
    vi.stubEnv('VOYAGE_API_KEY', 'test')
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ embedding: new Array(512).fill(0.1) }] }),
    } as unknown as Response)

    const vec = await embedQuery('tornillos')
    expect(vec).toHaveLength(512)
    expect(vec[0]).toBeCloseTo(0.1)
    vi.unstubAllEnvs()
  })

  it('embedQuery fails fast on retryable error (max 1 retry)', async () => {
    vi.stubEnv('VOYAGE_API_KEY', 'test')
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'unavailable',
    } as unknown as Response)

    await expect(embedQuery('test')).rejects.toThrow()
    expect(global.fetch).toHaveBeenCalledTimes(2)
    vi.unstubAllEnvs()
  })

  it('embedDocument uses full backoff (up to 5 retries) and succeeds after transient errors', async () => {
    vi.stubEnv('VOYAGE_API_KEY', 'test')
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limit',
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limit',
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: new Array(512).fill(0.5) }] }),
      } as unknown as Response)

    const vec = await embedDocument('test', { skipBackoffDelay: true })
    expect(vec).toHaveLength(512)
    expect(global.fetch).toHaveBeenCalledTimes(3)
    vi.unstubAllEnvs()
  })

  it('embedDocument gives up after exhausting all retries', async () => {
    vi.stubEnv('VOYAGE_API_KEY', 'test')
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    } as unknown as Response)

    await expect(embedDocument('test', { skipBackoffDelay: true })).rejects.toThrow()
    expect(global.fetch).toHaveBeenCalledTimes(6) // initial + 5 retries
    vi.unstubAllEnvs()
  })
})
