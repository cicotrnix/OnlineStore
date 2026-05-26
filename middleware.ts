import { auth } from '@/lib/auth'
import { maintainSession } from '@/lib/auth/middleware'
import { NextResponse } from 'next/server'

export default auth(async (req) => {
  await maintainSession(req)

  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (isAdmin && !req.auth) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})

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
