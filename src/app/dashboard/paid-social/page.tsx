'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar from '@/components/dashboard/FilterBar'
import MetricCard from '@/components/dashboard/MetricCard'

export default function PaidSocialPage() {
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
    fetch(`/api/dashboard/paid-social?clientId=${clientId}&days=${days}`)
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
      <DashboardHeader title="Paid Social" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard label="Ad spend" value={data?.metrics.spend.value ?? '—'} change={data?.metrics.spend.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
              <MetricCard label="Impressions" value={data?.metrics.impressions.value ?? '—'} change={data?.metrics.impressions.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
              <MetricCard label="Clicks" value={data?.metrics.clicks.value ?? '—'} change={data?.metrics.clicks.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
              <MetricCard label="CTR" value={data?.metrics.ctr.value ?? '—'} change={data?.metrics.ctr.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
              <MetricCard label="CPM" value={data?.metrics.cpm.value ?? '—'} change={data?.metrics.cpm.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
              <MetricCard label="ROAS" value={data?.metrics.roas.value ?? '—'} change={data?.metrics.roas.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
            </div>

            {/* Campaign breakdown */}
            <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-medium text-pgm-ink">Campaign breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-pgm-cream">
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Campaign</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Spend</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Impressions</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Clicks</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">CTR</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
                    )}
                    {!loading && (data?.campaigns ?? []).length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No campaign data for this period</td></tr>
                    )}
                    {(data?.campaigns ?? []).map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-pgm-ink max-w-xs truncate" title={c.name}>{c.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums">£{c.spend.toFixed(2)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{new Intl.NumberFormat('en-GB').format(c.impressions)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{new Intl.NumberFormat('en-GB').format(c.clicks)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{c.ctr.toFixed(2)}%</td>
                        <td className="px-5 py-3 text-right tabular-nums">{c.roas ? `${c.roas.toFixed(1)}x` : '—'}</td>
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
