'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar from '@/components/dashboard/FilterBar'
import MetricCard from '@/components/dashboard/MetricCard'

export default function EmailPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const clientId = user?.clientId

  const [days, setDays] = useState(30)
  const [data, setData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/email?clientId=${clientId}&days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else { setData(res.data); setLastUpdated(res.lastUpdated) }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [clientId, days])

  const lastUpdatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <DashboardHeader title="Email" />
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label="Emails sent" value={data ? new Intl.NumberFormat('en-GB').format(data.totalSent) : '—'} change={0} loading={loading} />
              <MetricCard label="Avg. open rate" value={data ? `${data.avgOpenRate}%` : '—'} change={0} loading={loading} />
              <MetricCard label="Avg. click rate" value={data ? `${data.avgClickRate}%` : '—'} change={0} loading={loading} />
              <MetricCard label="Avg. unsubscribe rate" value={data ? `${data.avgUnsubscribeRate}%` : '—'} change={0} loading={loading} />
            </div>

            {/* Campaign table */}
            <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-medium text-pgm-ink">Campaigns</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-pgm-cream">
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Campaign</th>
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Sent</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Sent #</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Open rate</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Click rate</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Unsubs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>}
                    {!loading && (data?.campaigns ?? []).length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No campaigns sent in this period</td></tr>
                    )}
                    {(data?.campaigns ?? []).map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-pgm-ink max-w-xs truncate" title={c.name}>{c.name}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {c.sentAt ? new Date(c.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{new Intl.NumberFormat('en-GB').format(c.sent)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <span className={c.openRate >= 25 ? 'text-pgm-green font-semibold' : 'text-pgm-ink'}>{c.openRate}%</span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <span className={c.clickRate >= 3 ? 'text-pgm-green font-semibold' : 'text-pgm-ink'}>{c.clickRate}%</span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-500">{c.unsubscribed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
