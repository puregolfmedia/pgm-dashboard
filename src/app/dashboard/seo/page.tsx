'use client'

import { useEffect, useState } from 'react'
import { useActiveClient } from '@/lib/useActiveClient'
import DashboardHeader from '@/components/layout/DashboardHeader'
import FilterBar, { useDateRange, compareText } from '@/components/dashboard/FilterBar'
import MetricCard from '@/components/dashboard/MetricCard'
import { pctChange } from '@/lib/utils'
import { sectionHelp, searchImpressionsHelp } from '@/lib/metricHelp'

const nf = new Intl.NumberFormat('en-GB')

function SearchTable({ title, keyLabel, rows, loading, emptyText }: {
  title: string
  keyLabel: string
  rows: any[]
  loading: boolean
  emptyText: string
}) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-medium text-pgm-ink">{title}</h2>
        {sectionHelp[title] && <p className="text-xs text-gray-400 mt-0.5">{sectionHelp[title]}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pgm-cream">
              <th className="text-left px-5 py-3 font-medium text-pgm-ink">{keyLabel}</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Clicks</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Impressions</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">CTR</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Avg. position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">{emptyText}</td></tr>
            )}
            {!loading && rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-600 max-w-xs truncate" title={row.key}>
                  {keyLabel === 'Page' ? row.key.replace(/^https?:\/\/[^/]+/, '') || '/' : row.key}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{nf.format(row.clicks)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{nf.format(row.impressions)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{row.ctr.toFixed(1)}%</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{row.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SeoPage() {
  const { clientId, ready, missingClientMessage } = useActiveClient()

  const [range, setRange, rangeQs] = useDateRange()
  const days = range.days
  const [data, setData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) {
      if (ready) { setError(missingClientMessage); setLoading(false) }
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/dashboard/seo?clientId=${clientId}&${rangeQs}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error)
        else { setData(res.data); setLastUpdated(res.lastUpdated) }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [clientId, ready, missingClientMessage, rangeQs])

  const lastUpdatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  const cur = data?.current
  const prev = data?.previous
  const period = compareText(range)

  return (
    <>
      <DashboardHeader title="Google Search" />
      <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar value={range} onChange={setRange} />
          {lastUpdatedTime && <p className="text-xs text-gray-400">Last updated: Today {lastUpdatedTime}</p>}
        </div>

        {error ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label="Clicks from Google" value={cur ? nf.format(cur.clicks) : '—'}
                change={cur && prev ? pctChange(cur.clicks, prev.clicks) : 0} changePeriod={period} loading={loading} />
              <MetricCard label="Impressions" help={searchImpressionsHelp} value={cur ? nf.format(cur.impressions) : '—'}
                change={cur && prev ? pctChange(cur.impressions, prev.impressions) : 0} changePeriod={period} loading={loading} />
              <MetricCard label="Click-through rate" value={cur ? `${cur.ctr.toFixed(1)}%` : '—'}
                change={cur && prev ? pctChange(cur.ctr, prev.ctr) : 0} changePeriod={period} loading={loading} />
              <MetricCard label="Avg. position" value={cur ? cur.position.toFixed(1) : '—'}
                change={0} changePeriod={prev?.position ? `was ${prev.position.toFixed(1)} · lower is better` : 'lower is better'} loading={loading} />
            </div>

            <SearchTable title="Top search terms" keyLabel="Search term" rows={data?.topQueries ?? []}
              loading={loading} emptyText="No search data for this period" />
            <SearchTable title="Top pages in Google" keyLabel="Page" rows={data?.topPages ?? []}
              loading={loading} emptyText="No search data for this period" />

            {data?.endDate && (
              <p className="text-xs text-gray-400">
                Google Search data runs about two days behind — figures shown up to {new Date(data.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
