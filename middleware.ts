import { type NextRequest, NextResponse } from 'next/server'

// Edge middleware: NO podemos usar Prisma ni auth() acá (Auth.js v5 con
// strategy=database falla con PrismaClientValidationError en wasm-engine-edge).
// Gate de /admin: presencia de cookie de sesión. La validación real
// (sesión existe en DB + isPlatformAdmin) la hace /admin/layout.tsx en RSC Node.
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const hasSession = SESSION_COOKIES.some((name) => req.cookies.get(name))
    if (!hasSession) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/cart',
    '/checkout/:path*',
    '/catalog/:path*',
    '/products/:path*',
  ],
}
