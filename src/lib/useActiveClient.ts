'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

/**
 * Which club's data a dashboard tab should load.
 *
 * - Club logins always see their own club.
 * - Admins pick a club with ?viewAs=<clientId> (set by Admin → Clients → View
 *   and carried between tabs by the sidebar). Without it there is nothing to show.
 *
 * The API routes enforce access themselves; this only decides what to request.
 */
export function useActiveClient() {
  const { data: session, status } = useSession()
  const params = useSearchParams()
  const user = session?.user as any
  const isAdmin = user?.role === 'ADMIN'
  const viewAs = isAdmin ? params.get('viewAs') : null
  const clientId: string | null = isAdmin ? viewAs : (user?.clientId ?? null)

  return {
    clientId,
    isAdmin,
    /** Session has loaded, so a missing clientId is final rather than pending. */
    ready: status !== 'loading',
    /** Message to show when there is no club to load. */
    missingClientMessage: isAdmin
      ? 'Choose a club under Admin → Clients → View to see its dashboard.'
      : 'No club is linked to this login. Contact Pure Golf Media.',
  }
}
