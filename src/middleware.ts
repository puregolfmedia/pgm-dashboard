import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session?.user
  const role = (session?.user as any)?.role
  const passwordResetRequired = (session?.user as any)?.passwordResetRequired

  const isLoginPage = nextUrl.pathname === '/login'
  const isChangePassword = nextUrl.pathname === '/change-password'
  const isDashboard = nextUrl.pathname.startsWith('/dashboard')
  const isAdmin = nextUrl.pathname.startsWith('/admin')
  const isApiDashboard = nextUrl.pathname.startsWith('/api/dashboard')
  const isApiAdmin = nextUrl.pathname.startsWith('/api/admin')
  // NextAuth's own endpoints (/api/auth/session, /csrf, /signout, …) plus our
  // /api/auth/change-password route must never be redirected. A 307 redirect
  // keeps the POST method, so signing out after setting a password ended up
  // POSTing to the static /change-password page and failing with 405.
  // The change-password route checks the session itself.
  // Public: website forms post enquiries here (checked by secret token in the route)
  if (nextUrl.pathname.startsWith('/api/intake/')) {
    return NextResponse.next()
  }

  if (nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Unauthenticated — redirect to login
  if (!isLoggedIn && (isDashboard || isAdmin || isApiDashboard || isApiAdmin || isChangePassword)) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Already logged in — skip login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL(passwordResetRequired ? '/change-password' : '/dashboard', nextUrl))
  }

  // Password reset required — only allow /change-password and /api/auth/change-password
  if (isLoggedIn && passwordResetRequired && !isChangePassword) {
    return NextResponse.redirect(new URL('/change-password', nextUrl))
  }

  // Admin-only routes
  if ((isAdmin || isApiAdmin) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
