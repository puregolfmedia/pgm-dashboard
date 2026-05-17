'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar from '@/components/dashboard/FilterBar'
import TopLandingPagesTable from '@/components/dashboard/TopLandingPagesTable'

export default function PagesPage() {
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
    fetch(`/api/dashboard/pages?clientId=${clientId}&days=${days}`)
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
      <DashboardHeader title="Pages" />
      <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar days={days} onDaysChange={setDays} />
          {lastUpdatedTime && <p className="text-xs text-gray-400">Last updated: Today {lastUpdatedTime}</p>}
        </div>

        {error ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : loading ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl h-64 animate-pulse" />
        ) : (
          <TopLandingPagesTable data={data} />
        )}
      </div>
    </>
  )
}
