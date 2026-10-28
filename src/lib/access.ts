import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export interface Access {
  user: { id: string; role: 'ADMIN' | 'CLIENT'; clientId: string | null }
  clientId: string
  isAdmin: boolean
}

/**
 * Work out which club a dashboard API request is for, and whether the caller
 * may see it. Club logins only ever get their own club; admins pass ?clientId=.
 * Returns a ready-made error response when access is refused.
 */
export async function resolveClientAccess(request: Request): Promise<Access | NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const isAdmin = user.role === 'ADMIN'
  const requested = new URL(request.url).searchParams.get('clientId')
  const clientId = isAdmin ? requested : user.clientId

  if (!isAdmin && requested && requested !== user.clientId) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }
  if (!clientId) return NextResponse.json({ data: null, error: 'No client associated' }, { status: 400 })

  return { user, clientId, isAdmin }
}

export async function requireAdmin(): Promise<boolean> {
  const session = await auth()
  return (session?.user as any)?.role === 'ADMIN'
}
