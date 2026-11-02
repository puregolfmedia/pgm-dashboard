'use client'

import { useEffect, useState } from 'react'
import { LEVEL } from './AllClientsOverview'

/** Tracking health for one club, shown at the top of its admin page. */
export default function ClientHealthBanner({ clientId }: { clientId: string }) {
  const [h, setH] = useState<any>(null)
  useEffect(() => {
    fetch(`/api/admin/health?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json()).then((r) => setH(r.data?.[0] ?? null)).catch(() => {})
  }, [clientId])
  if (!h) return null
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 space-y-2">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-pgm-ink">Tracking health</h2>
        <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${LEVEL[h.level]?.cls}`}>{LEVEL[h.level]?.text}</span>
      </div>
      {h.issues?.length ? h.issues.map((i: any, n: number) => (
        <p key={n} className={`text-sm rounded-lg px-3 py-2 ${i.level === 'problem' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{i.text}</p>
      )) : <p className="text-xs text-gray-400">{h.level === 'ok' ? 'Visits, key actions and connections all look normal.' : h.level === 'demo' ? 'Demo club — shows sample data.' : 'Connect a data source below to start checking.'}</p>}
    </div>
  )
}
