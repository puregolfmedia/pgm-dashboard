'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar from '@/components/dashboard/FilterBar'

export default function UTMsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const clientId = user?.clientId

  const [days, setDays] = useState(30)
  const [data, setData] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/utms?clientId=${clientId}&days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else { setData(res.data ?? []); setLastUpdated(res.lastUpdated) }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [clientId, days])

  const lastUpdatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <DashboardHeader title="UTMs" />
      <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar days={days} onDaysChange={setDays} />
          {lastUpdatedTime && <p className="text-xs text-gray-400">Last updated: Today {lastUpdatedTime}</p>}
        </div>

        {error ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-pgm-cream">
                    <th className="text-left px-5 py-3 font-medium text-pgm-ink">Source</th>
                    <th className="text-left px-5 py-3 font-medium text-pgm-ink">Medium</th>
                    <th className="text-left px-5 py-3 font-medium text-pgm-ink">Campaign</th>
                    <th className="text-right px-5 py-3 font-medium text-pgm-ink">Sessions</th>
                    <th className="text-right px-5 py-3 font-medium text-pgm-ink">Booking starts</th>
                    <th className="text-right px-5 py-3 font-medium text-pgm-ink">Conv. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
                  )}
                  {!loading && data.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No UTM data for this period</td></tr>
                  )}
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-pgm-ink">{row.source || '(direct)'}</td>
                      <td className="px-5 py-3 text-gray-500">{row.medium || '(none)'}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-xs truncate" title={row.campaign}>{row.campaign || '(not set)'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{new Intl.NumberFormat('en-GB').format(row.sessions)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{new Intl.NumberFormat('en-GB').format(row.bookingStarts)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className={row.conversionRate >= 5 ? 'text-pgm-green font-semibold' : 'text-pgm-ink'}>
                          {row.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
