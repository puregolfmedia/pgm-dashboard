'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar from '@/components/dashboard/FilterBar'
import MetricCard from '@/components/dashboard/MetricCard'
import BookingsByDayChart from '@/components/dashboard/BookingsByDayChart'
import TrafficSourceChart from '@/components/dashboard/TrafficSourceChart'

export default function MembershipPage() {
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
    fetch(`/api/dashboard/membership?clientId=${clientId}&days=${days}`)
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
      <DashboardHeader title="Membership" />
      <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar days={days} onDaysChange={setDays} />
          {lastUpdatedTime && <p className="text-xs text-gray-400">Last updated: Today {lastUpdatedTime}</p>}
        </div>

        {error ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">{error}</p>
            {error.includes('not configured') && (
              <p className="text-xs text-gray-400 mt-2">
                Set the membership event name in Admin → Edit Client (default: <code className="bg-gray-100 px-1 rounded">membership_enquiry</code>).
              </p>
            )}
          </div>
        ) : (
          <>
            {data?.eventName && (
              <p className="text-xs text-gray-400">
                Tracking GA4 event: <code className="bg-gray-100 px-1 rounded">{data.eventName}</code>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <MetricCard label="Membership enquiries" value={data?.metrics.enquiries.value ?? '—'} change={data?.metrics.enquiries.change ?? 0} changePeriod={data?.metrics.enquiries.changePeriod} loading={loading} />
              <MetricCard label="Sessions" value={data?.metrics.sessions.value ?? '—'} change={data?.metrics.sessions.change ?? 0} changePeriod={data?.metrics.sessions.changePeriod} loading={loading} />
              <MetricCard label="Enquiry rate" value={data?.metrics.conversionRate.value ?? '—'} change={0} changePeriod={data?.metrics.conversionRate.changePeriod} loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {loading ? (
                <>
                  <div className="bg-white border border-[#E8E8E8] rounded-2xl h-72 animate-pulse" />
                  <div className="bg-white border border-[#E8E8E8] rounded-2xl h-72 animate-pulse" />
                </>
              ) : (
                <>
                  <BookingsByDayChart data={data?.trend ?? []} />
                  <TrafficSourceChart data={data?.sources ?? []} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
