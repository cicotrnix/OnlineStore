import { describe, expect, it } from 'vitest'
import { GET } from '../route'

describe('GET /api/health', () => {
  it('returns enriched payload with version, commit, lastMigration, uptime', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('ok')
    expect(typeof body.version).toBe('string')
    expect(typeof body.commit).toBe('string')
    expect(typeof body.uptime).toBe('number')
    expect('lastMigration' in body).toBe(true)
    expect(typeof body.timestamp).toBe('string')
  })
})
