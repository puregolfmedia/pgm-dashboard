'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useActiveClient } from '@/lib/useActiveClient'

/** Amber strip shown while an admin is viewing a club's dashboard. */
export default function AdminViewBanner() {
  const { clientId, isAdmin } = useActiveClient()
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin || !clientId) return
    fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((res) => setName(res.data?.name ?? null))
      .catch(() => setName(null))
  }, [isAdmin, clientId])

  if (!isAdmin || !clientId) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3">
      <p className="text-xs text-amber-700 font-medium">
        👁 Admin view — you are seeing this dashboard as <strong>{name ?? '…'}</strong>
      </p>
      <Link href={`/admin/clients/${clientId}`} className="text-xs text-amber-700 hover:text-amber-900 underline shrink-0">
        ← Back to admin
      </Link>
    </div>
  )
}
