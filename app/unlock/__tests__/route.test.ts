import { BYPASS_COOKIE_NAME, computeBypassToken } from '@/lib/maintenance/token'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

function makeReq(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

beforeEach(() => {
  vi.stubEnv('MAINTENANCE_BYPASS_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/unlock', () => {
  it('?key= correcto → redirect a / + cookie maint_bypass válida', async () => {
    vi.stubEnv('MAINTENANCE_BYPASS_KEY', 'topsecret')
    const res = await GET(makeReq('/unlock?key=topsecret'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/$/)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${BYPASS_COOKIE_NAME}=`)
    expect(setCookie).toMatch(/HttpOnly/i)
    // Cookie value debe ser el token computado.
    const expected = await computeBypassToken('topsecret')
    expect(setCookie).toContain(expected)
  })

  it('?key= incorrecto → 404 (oculta el flow)', async () => {
    vi.stubEnv('MAINTENANCE_BYPASS_KEY', 'topsecret')
    const res = await GET(makeReq('/unlock?key=wrong'))
    expect(res.status).toBe(404)
  })

  it('sin ?key= → 404', async () => {
    vi.stubEnv('MAINTENANCE_BYPASS_KEY', 'topsecret')
    const res = await GET(makeReq('/unlock'))
    expect(res.status).toBe(404)
  })

  it('sin MAINTENANCE_BYPASS_KEY configurada → 404 (defense in depth)', async () => {
    const res = await GET(makeReq('/unlock?key=anything'))
    expect(res.status).toBe(404)
  })

  it('?clear=1 → redirect a / + cookie con maxAge 0 (limpieza)', async () => {
    const res = await GET(makeReq('/unlock?clear=1'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/$/)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain(`${BYPASS_COOKIE_NAME}=`)
    expect(setCookie).toMatch(/Max-Age=0/i)
  })
})
