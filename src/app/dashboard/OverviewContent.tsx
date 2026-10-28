'use client'

import { useEffect, useState } from 'react'
import MetricCard from '@/components/dashboard/MetricCard'
import BookingsByDayChart from '@/components/dashboard/BookingsByDayChart'
import TrafficSourceChart from '@/components/dashboard/TrafficSourceChart'
import TopLandingPagesTable from '@/components/dashboard/TopLandingPagesTable'
import FilterBar, { useDateRange, compareText } from '@/components/dashboard/FilterBar'
import Link from 'next/link'
import GoalProgressList from '@/components/dashboard/GoalProgressList'
import { pctChange } from '@/lib/utils'
import type { GoalProgress } from '@/lib/goals'
import type { ChartNote } from '@/components/dashboard/BookingsByDayChart'

const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

interface OverviewContentProps {
  clientId: string | null
  isAdmin: boolean
}

export default function OverviewContent({ clientId, isAdmin }: OverviewContentProps) {
  const [range, setRange, rangeQs] = useDateRange()
  const days = range.days
  const [data, setData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<GoalProgress[]>([])
  const [notes, setNotes] = useState<ChartNote[]>([])
  const [enquiries, setEnquiries] = useState<any>(null)

  // Goals, "what we did" notes and the enquiries summary come from our own
  // database, so they show even if Google Analytics is down or not set up.
  useEffect(() => {
    if (!clientId) return
    const q = `clientId=${clientId}&${rangeQs}`
    fetch(`/api/dashboard/goals?clientId=${clientId}`).then((r) => r.json()).then((r) => setGoals(r.data ?? [])).catch(() => {})
    fetch(`/api/dashboard/notes?${q}`).then((r) => r.json()).then((r) => setNotes(r.data ?? [])).catch(() => {})
    fetch(`/api/dashboard/enquiries?${q}`).then((r) => r.json()).then((r) => setEnquiries(r.data ?? null)).catch(() => {})
  }, [clientId, rangeQs])

  const extras = (
    <>
      <GoalProgressList goals={goals} />
      {enquiries?.summary && (enquiries.summary.total > 0 || enquiries.previous?.total > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard label="Enquiries received" value={String(enquiries.summary.total)}
            change={pctChange(enquiries.summary.total, enquiries.previous.total)} changePeriod={compareText(range)} />
          <MetricCard label="Enquiries booked" value={`${enquiries.summary.booked} (${enquiries.summary.conversionRate}%)`}
            change={pctChange(enquiries.summary.booked, enquiries.previous.booked)} changePeriod={compareText(range)} />
          <MetricCard label="Booked revenue" value={gbp(enquiries.summary.bookedValue)}
            change={pctChange(enquiries.summary.bookedValue, enquiries.previous.bookedValue)} changePeriod={compareText(range)} />
        </div>
      )}
    </>
  )

  useEffect(() => {
    if (!clientId && !isAdmin) { setError('No client associated with this account'); setLoading(false); return }
    if (!clientId && isAdmin) { setLoading(false); return }

    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/overview?clientId=${clientId}&${rangeQs}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else { setData(res.data); setLastUpdated(res.lastUpdated) }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [clientId, isAdmin, rangeQs])

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
      <div className="px-4 sm:px-8 py-8 space-y-4 sm:space-y-6">
        {extras}
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
  const customLabel: string | null = data?.labels?.booking ?? null
  const bookingLabel = customLabel ?? 'Booking starts'
  const lastUpdatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FilterBar value={range} onChange={setRange} />
        {lastUpdatedTime && (
          <p className="text-xs text-gray-400">Last updated: Today {lastUpdatedTime}</p>
        )}
      </div>

      {/* A data source failed — say so rather than showing misleading zeros */}
      {!loading && data?.warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 space-y-1">
          {data.warnings.map((w: string) => (
            <p key={w} className="text-sm text-amber-800">{w}</p>
          ))}
        </div>
      )}

      {extras}

      {/* Metric cards — row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Sessions" value={metrics?.sessions.value ?? '—'} change={metrics?.sessions.change ?? 0} changePeriod={compareText(range)} loading={loading} />
        <MetricCard label={bookingLabel} help={customLabel ? `How many times this was recorded on your website: ${bookingLabel}.` : undefined} value={metrics?.bookingStarts.value ?? '—'} change={metrics?.bookingStarts.change ?? 0} changePeriod={compareText(range)} loading={loading} />
        <MetricCard label={customLabel ? `Cost / ${bookingLabel}` : 'Cost / booking start'} help={customLabel ? `Ad spend divided by ${bookingLabel}: what each one cost in advertising.` : undefined} value={metrics?.costPerBooking.value ?? '—'} change={metrics?.costPerBooking.change ?? 0} changePeriod={compareText(range)} loading={loading} />
      </div>

      {/* Metric cards — row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="CTR" value={metrics?.ctr.value ?? '—'} change={metrics?.ctr.change ?? 0} changePeriod={compareText(range)} loading={loading} />
        <MetricCard label="Ad spend" value={metrics?.adSpend.value ?? '—'} change={metrics?.adSpend.change ?? 0} changePeriod={compareText(range)} loading={loading} />
        <MetricCard label="ROAS" value={metrics?.roas.value ?? '—'} change={metrics?.roas.change ?? 0} changePeriod={compareText(range)} loading={loading} />
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
            <BookingsByDayChart data={data?.dailyBookings ?? []} label={bookingLabel} notes={notes} />
            <TrafficSourceChart data={data?.trafficSources ?? []} />
          </>
        )}
      </div>

      {/* Landing pages table */}
      {loading ? (
        <div className="bg-white border border-[#E8E8E8] rounded-2xl h-48 animate-pulse" />
      ) : (
        <TopLandingPagesTable data={data?.landingPages ?? []} label={bookingLabel} />
      )}
    </div>
  )
}
