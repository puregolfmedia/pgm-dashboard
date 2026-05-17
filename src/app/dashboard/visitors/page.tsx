'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar from '@/components/dashboard/FilterBar'
import MetricCard from '@/components/dashboard/MetricCard'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export default function VisitorsPage() {
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
    fetch(`/api/dashboard/visitors?clientId=${clientId}&days=${days}`)
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
      <DashboardHeader title="Visitors" />
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
            {/* Summary metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard
                label="Total users"
                value={data ? new Intl.NumberFormat('en-GB').format(data.totalUsers) : '—'}
                change={0}
                loading={loading}
              />
              <MetricCard
                label="New users"
                value={data ? new Intl.NumberFormat('en-GB').format(data.newUsers) : '—'}
                change={0}
                loading={loading}
              />
              <MetricCard
                label="Sessions"
                value={data ? new Intl.NumberFormat('en-GB').format(data.sessions) : '—'}
                change={0}
                loading={loading}
              />
              <MetricCard
                label="Bounce rate"
                value={data ? `${(data.bounceRate * 100).toFixed(1)}%` : '—'}
                change={0}
                loading={loading}
              />
              <MetricCard
                label="Avg. session duration"
                value={data ? formatDuration(data.avgSessionDuration) : '—'}
                change={0}
                loading={loading}
              />
            </div>

            {/* Device + channel breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Device breakdown */}
              <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
                <h2 className="text-sm font-medium text-pgm-ink mb-4">Device breakdown</h2>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(data?.deviceBreakdown ?? []).map((d: any) => {
                      const total = data.deviceBreakdown.reduce((s: number, r: any) => s + r.sessions, 0)
                      const pct = total > 0 ? Math.round((d.sessions / total) * 100) : 0
                      return (
                        <div key={d.device}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-pgm-ink">{d.device}</span>
                            <span className="text-gray-400 tabular-nums">{new Intl.NumberFormat('en-GB').format(d.sessions)} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-pgm-green rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Channel breakdown */}
              <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
                <h2 className="text-sm font-medium text-pgm-ink mb-4">Channel breakdown</h2>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(data?.channelBreakdown ?? []).map((d: any) => {
                      const total = data.channelBreakdown.reduce((s: number, r: any) => s + r.users, 0)
                      const pct = total > 0 ? Math.round((d.users / total) * 100) : 0
                      return (
                        <div key={d.channel}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-pgm-ink">{d.channel}</span>
                            <span className="text-gray-400 tabular-nums">{new Intl.NumberFormat('en-GB').format(d.users)} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-pgm-green rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
