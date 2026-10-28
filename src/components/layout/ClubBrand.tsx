'use client'

import { useEffect, useState } from 'react'
import { useActiveClient } from '@/lib/useActiveClient'

/** Sidebar header: the club's own logo and name when viewing a club, otherwise Pure Golf Media. */
export default function ClubBrand() {
  const { clientId } = useActiveClient()
  const [club, setClub] = useState<{ name: string; logoUrl: string | null; brandColor: string | null } | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setClub(null)
    setLogoFailed(false)
    if (!clientId) return
    fetch(`/api/dashboard/club?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json()).then((r) => setClub(r.data ?? null)).catch(() => {})
  }, [clientId])

  if (!club) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-pgm-green flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">PGM</span>
        </div>
        <span className="text-white font-semibold text-sm leading-tight">Pure Golf Media</span>
      </div>
    )
  }

  const initials = club.name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {club.logoUrl && !logoFailed ? (
        <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden p-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={club.logoUrl} alt="" className="max-w-full max-h-full object-contain" onError={() => setLogoFailed(true)} />
        </span>
      ) : (
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ background: club.brandColor ?? '#006648' }}>{initials || 'GC'}</span>
      )}
      <span className="min-w-0">
        <span className="block text-white font-semibold text-sm leading-tight truncate">{club.name}</span>
        <span className="block text-pgm-silver/60 text-[11px] leading-tight">with Pure Golf Media</span>
      </span>
    </div>
  )
}
