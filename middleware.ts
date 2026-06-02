import { MAINTENANCE_HTML } from '@/lib/maintenance/page-html'
import { BYPASS_COOKIE_NAME, verifyBypassToken } from '@/lib/maintenance/token'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Edge middleware. Dos responsabilidades:
 *   1. Modo mantenimiento global (MAINTENANCE_MODE=on) — bloquea TODO el sitio
 *      excepto paths exentos + cookie de bypass.
 *   2. Gate de /admin: presencia de cookie de sesión (la verificación real
 *      la hace /admin/layout.tsx en RSC Node).
 *
 * NO podemos usar Prisma ni auth() acá (Auth.js v5 con strategy=database
 * falla con PrismaClientValidationError en wasm-engine-edge). Sólo env + cookies.
 *
 * Default seguro: sin MAINTENANCE_MODE=on, todo pasa.
 */

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

// Paths siempre exentos del gate de mantenimiento.
function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname === '/unlock' ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/icon.svg' ||
    pathname === '/logo-pipower.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  )
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // ───────── Modo mantenimiento ─────────
  if (process.env.MAINTENANCE_MODE === 'on' && !isMaintenanceExempt(pathname)) {
    const cookieValue = req.cookies.get(BYPASS_COOKIE_NAME)?.value
    const allowed = await verifyBypassToken(process.env.MAINTENANCE_BYPASS_KEY, cookieValue)
    if (!allowed) {
      return new NextResponse(MAINTENANCE_HTML, {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
          'Retry-After': '3600',
        },
      })
    }
  }

  // ───────── Gate /admin ─────────
  if (pathname.startsWith('/admin')) {
    const hasSession = SESSION_COOKIES.some((name) => req.cookies.get(name))
    if (!hasSession) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Matcher amplio para cubrir landing + todo el storefront. Excluimos assets
  // a nivel matcher para evitar correr middleware en cada request estática.
  matcher: [
    '/((?!_next/static|_next/image|favicon|icon\\.svg|logo-pipower\\.png|robots\\.txt|sitemap\\.xml|api/health|api/webhooks).*)',
  ],
}
