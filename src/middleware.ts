import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session?.user
  const role = (session?.user as any)?.role
  const username = (session?.user as any)?.username
  const passwordResetRequired = (session?.user as any)?.passwordResetRequired
  const crmOwner = process.env.CRM_OWNER

  const isLoginPage = nextUrl.pathname === '/login'
  const isChangePassword = nextUrl.pathname === '/change-password'
  const isDashboard = nextUrl.pathname.startsWith('/dashboard')
  const isAdmin = nextUrl.pathname.startsWith('/admin')
  const isCrm = nextUrl.pathname.startsWith('/crm')
  const isApiDashboard = nextUrl.pathname.startsWith('/api/dashboard')
  const isApiAdmin = nextUrl.pathname.startsWith('/api/admin')
  const isApiCrm = nextUrl.pathname.startsWith('/api/crm')
  const isApiChangePassword = nextUrl.pathname === '/api/auth/change-password'

  // Unauthenticated — redirect to login
  if (!isLoggedIn && (isDashboard || isAdmin || isCrm || isApiDashboard || isApiAdmin || isApiCrm || isChangePassword)) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Already logged in — skip login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL(passwordResetRequired ? '/change-password' : '/dashboard', nextUrl))
  }

  // Password reset required — only allow /change-password and /api/auth/change-password
  if (isLoggedIn && passwordResetRequired && !isChangePassword && !isApiChangePassword) {
    return NextResponse.redirect(new URL('/change-password', nextUrl))
  }

  // Admin-only routes
  if ((isAdmin || isApiAdmin) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // CRM is personal — only the CRM owner can access it
  if ((isCrm || isApiCrm) && username !== crmOwner) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
