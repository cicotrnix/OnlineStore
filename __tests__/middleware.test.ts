import { BYPASS_COOKIE_NAME, computeBypassToken } from '@/lib/maintenance/token'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import middleware from '../middleware'

function makeReq(pathname: string, opts: { cookies?: Record<string, string> } = {}): NextRequest {
  const url = new URL(`http://localhost${pathname}`)
  const req = new NextRequest(url)
  if (opts.cookies) {
    for (const [k, v] of Object.entries(opts.cookies)) req.cookies.set(k, v)
  }
  return req
}

beforeEach(() => {
  vi.stubEnv('MAINTENANCE_MODE', '')
  vi.stubEnv('MAINTENANCE_BYPASS_KEY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('middleware — maintenance OFF (default seguro)', () => {
  it('MAINTENANCE_MODE ausente → pasa sin bloquear', async () => {
    const res = await middleware(makeReq('/catalog'))
    expect(res.status).toBe(200) // NextResponse.next() devuelve 200 vacío
  })

  it('MAINTENANCE_MODE=off (explícito) → pasa', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'off')
    const res = await middleware(makeReq('/'))
    expect(res.status).toBe(200)
  })

  it('MAINTENANCE_MODE=true (typo, no es "on") → pasa', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true')
    const res = await middleware(makeReq('/'))
    expect(res.status).toBe(200)
  })
})

describe('middleware — maintenance ON', () => {
  beforeEach(() => {
    vi.stubEnv('MAINTENANCE_MODE', 'on')
    vi.stubEnv('MAINTENANCE_BYPASS_KEY', 'secret-key-abc')
  })

  it('anónimo en / → 503 + HTML maintenance + noindex', async () => {
    const res = await middleware(makeReq('/'))
    expect(res.status).toBe(503)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(res.headers.get('x-robots-tag')).toMatch(/noindex/i)
    expect(res.headers.get('retry-after')).toBe('3600')
    const body = await res.text()
    expect(body).toMatch(/PiPower/i)
    // Default = EN; el ES también está disponible vía ?lang=es / cookie locale=es-419.
    expect(body).toMatch(/getting the wholesale store ready/i)
  })

  it('anónimo en /catalog → 503', async () => {
    const res = await middleware(makeReq('/catalog'))
    expect(res.status).toBe(503)
  })

  it('anónimo en /products/abc → 503', async () => {
    const res = await middleware(makeReq('/products/abc'))
    expect(res.status).toBe(503)
  })

  it('/api/health → siempre pasa (exempt)', async () => {
    const res = await middleware(makeReq('/api/health'))
    expect(res.status).toBe(200)
  })

  it('/api/webhooks/stripe → siempre pasa (exempt)', async () => {
    const res = await middleware(makeReq('/api/webhooks/stripe'))
    expect(res.status).toBe(200)
  })

  it('/unlock → siempre pasa (para la ruta de bypass)', async () => {
    const res = await middleware(makeReq('/unlock'))
    expect(res.status).toBe(200)
  })

  it('/_next/static/x.js → siempre pasa (assets)', async () => {
    const res = await middleware(makeReq('/_next/static/chunks/main.js'))
    expect(res.status).toBe(200)
  })

  it('cookie de bypass válida → pasa al sitio', async () => {
    const token = await computeBypassToken('secret-key-abc')
    const res = await middleware(makeReq('/', { cookies: { [BYPASS_COOKIE_NAME]: token } }))
    expect(res.status).toBe(200)
  })

  it('cookie de bypass con secret rotado → 503', async () => {
    const token = await computeBypassToken('old-secret')
    const res = await middleware(makeReq('/', { cookies: { [BYPASS_COOKIE_NAME]: token } }))
    expect(res.status).toBe(503)
  })

  it('cookie de bypass tampered → 503', async () => {
    const token = await computeBypassToken('secret-key-abc')
    const tampered = `${token.slice(0, -1)}X`
    const res = await middleware(makeReq('/', { cookies: { [BYPASS_COOKIE_NAME]: tampered } }))
    expect(res.status).toBe(503)
  })
})

describe('middleware — /admin gate (sin maintenance)', () => {
  it('/admin sin sesión → redirect a /sign-in', async () => {
    const res = await middleware(makeReq('/admin'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/sign-in$/)
  })

  it('/admin con cookie de sesión → pasa', async () => {
    const res = await middleware(
      makeReq('/admin', { cookies: { 'authjs.session-token': 'fake-token' } })
    )
    expect(res.status).toBe(200)
  })

  it('/admin con maintenance ON + bypass válido → pasa el gate /admin también', async () => {
    vi.stubEnv('MAINTENANCE_MODE', 'on')
    vi.stubEnv('MAINTENANCE_BYPASS_KEY', 'k')
    const token = await computeBypassToken('k')
    const res = await middleware(
      makeReq('/admin', {
        cookies: {
          [BYPASS_COOKIE_NAME]: token,
          // sin sesión → redirige a /sign-in (no a maintenance)
        },
      })
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/\/sign-in/)
  })
})
