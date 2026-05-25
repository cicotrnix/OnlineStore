import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (isAdmin && !req.auth) {
    const url = new URL('/sign-in', req.url)
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: ['/admin/:path*'],
}
