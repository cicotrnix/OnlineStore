import { BYPASS_COOKIE_NAME, computeBypassToken } from '@/lib/maintenance/token'
import { type NextRequest, NextResponse } from 'next/server'

// Edge para mantenerse coherente con el middleware (mismo runtime, mismas
// limitaciones). Nada de DB acá tampoco.
export const runtime = 'edge'

/**
 * /unlock?key=<MAINTENANCE_BYPASS_KEY> → setea cookie firmada y redirige a /.
 * /unlock?clear=1 → borra la cookie y redirige a /.
 *
 * Si la key no coincide: 404 (oculta la existencia del flow).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const url = req.nextUrl
  const clear = url.searchParams.get('clear')

  if (clear === '1') {
    const res = NextResponse.redirect(new URL('/', req.url))
    res.cookies.set({
      name: BYPASS_COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
    })
    return res
  }

  const key = url.searchParams.get('key')
  const secret = process.env.MAINTENANCE_BYPASS_KEY
  if (!secret || !key || key !== secret) {
    return new NextResponse('Not found', { status: 404 })
  }

  const token = await computeBypassToken(secret)
  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set({
    name: BYPASS_COOKIE_NAME,
    value: token,
    path: '/',
    // 30 días — owner + testers no se reautentican constantemente.
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
  })
  return res
}
