'use client'

import { useEffect, useState } from 'react'
import MetricCard from '@/components/dashboard/MetricCard'
import BookingsByDayChart from '@/components/dashboard/BookingsByDayChart'
import TrafficSourceChart from '@/components/dashboard/TrafficSourceChart'
import TopLandingPagesTable from '@/components/dashboard/TopLandingPagesTable'
import FilterBar from '@/components/dashboard/FilterBar'
import Link from 'next/link'

interface OverviewContentProps {
  clientId: string | null
  isAdmin: boolean
}

export default function OverviewContent({ clientId, isAdmin }: OverviewContentProps) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId && !isAdmin) { setError('No client associated with this account'); setLoading(false); return }
    if (!clientId && isAdmin) { setLoading(false); return }

    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/overview?clientId=${clientId}&days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else { setData(res.data); setLastUpdated(res.lastUpdated) }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [clientId, isAdmin, days])

  if (!clientId && isAdmin) {
    return (
      <div className="px-4 sm:px-8 py-8">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-8 text-center">
          <p className="text-sm font-medium text-pgm-ink mb-1">Admin view</p>
          <p className="text-sm text-gray-400">
            Go to{' '}
            <Link href="/admin" className="text-pgm-green underline">Admin → Clients → View</Link>
            {' '}to see a specific client&apos;s dashboard.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    const isNotConfigured = error.includes('not configured') || error.includes('Data source')
    return (
      <div className="px-4 sm:px-8 py-8">
        <div className={`border rounded-2xl p-6 text-center ${isNotConfigured ? 'bg-white border-[#E8E8E8]' : 'bg-amber-50 border-amber-100'}`}>
          <p className={`text-sm font-medium mb-1 ${isNotConfigured ? 'text-pgm-ink' : 'text-amber-800'}`}>
            {isNotConfigured ? 'Data not yet connected' : 'Data temporarily unavailable'}
          </p>
          <p className={`text-sm ${isNotConfigured ? 'text-gray-400' : 'text-amber-600'}`}>{error}</p>
          {isAdmin && isNotConfigured && (
            <Link href="/admin" className="inline-block mt-3 text-xs text-pgm-green underline">
              Configure in admin panel →
            </Link>
          )}
        </div>
      </div>
    )
  }

  const metrics = data?.metrics
  const lastUpdatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FilterBar days={days} onDaysChange={setDays} />
        {lastUpdatedTime && (
          <p className="text-xs text-gray-400">Last updated: Today {lastUpdatedTime}</p>
        )}
      </div>

      {/* Metric cards — row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Sessions" value={metrics?.sessions.value ?? '—'} change={metrics?.sessions.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
        <MetricCard label="Booking starts" value={metrics?.bookingStarts.value ?? '—'} change={metrics?.bookingStarts.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
        <MetricCard label="Cost / booking start" value={metrics?.costPerBooking.value ?? '—'} change={metrics?.costPerBooking.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
      </div>

      {/* Metric cards — row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="CTR" value={metrics?.ctr.value ?? '—'} change={metrics?.ctr.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
        <MetricCard label="Ad spend" value={metrics?.adSpend.value ?? '—'} change={metrics?.adSpend.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
        <MetricCard label="ROAS" value={metrics?.roas.value ?? '—'} change={metrics?.roas.change ?? 0} changePeriod={`vs prior ${days} days`} loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {loading ? (
          <>
            <div className="bg-white border border-[#E8E8E8] rounded-2xl h-72 animate-pulse" />
            <div className="bg-white border border-[#E8E8E8] rounded-2xl h-72 animate-pulse" />
          </>
        ) : (
          <>
            <BookingsByDayChart data={data?.dailyBookings ?? []} />
            <TrafficSourceChart data={data?.trafficSources ?? []} />
          </>
        )}
      </div>

      {/* Landing pages table */}
      {loading ? (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl h-48 animate-pulse" />
      ) : (
        <TopLandingPagesTable data={data?.landingPages ?? []} />
      )}
    </div>
  )
}
