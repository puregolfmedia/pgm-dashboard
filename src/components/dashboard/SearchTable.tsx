'use client'

import { sectionHelp } from '@/lib/metricHelp'

const nf = new Intl.NumberFormat('en-GB')

export default function SearchTable({ title, keyLabel, rows, loading, emptyText }: {
  title: string
  keyLabel: string
  rows: any[]
  loading: boolean
  emptyText: string
}) {
  return (
    <div className="bg-white border border-pgm-line rounded-xl overflow-hidden">
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
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Times shown</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Click rate</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Avg. Google position</th>
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
