'use client'

import { sectionHelp } from '@/lib/metricHelp'
import type { SearchMover } from '@/lib/searchConsole'

const nf = new Intl.NumberFormat('en-GB')

// Searches where the club moved up Google compared with the previous period.
// Rows come pre-sorted from the API: new page-1 entries first, then the
// biggest climbs.

export default function SearchMovers({ rows, loading, comparison }: {
  rows: SearchMover[]
  loading: boolean
  comparison?: string
}) {
  const title = 'Biggest climbs on Google'
  return (
    <div className="bg-white border border-pgm-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-medium text-pgm-ink">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {sectionHelp[title]}{comparison ? ` Positions compared ${comparison}.` : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pgm-cream">
              <th className="text-left px-5 py-3 font-medium text-pgm-ink">What people searched for</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Was</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Now</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Places up</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Times shown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                No big moves in these dates yet. Rankings usually shift a few weeks after website changes.
              </td></tr>
            )}
            {!loading && rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-600 max-w-xs" title={row.key}>
                  <span className="truncate">{row.key}</span>
                  {row.newOnPage1 && (
                    <span className="ml-2 inline-block rounded-full bg-pgm-green/10 text-pgm-green text-[11px] font-medium px-2 py-0.5 whitespace-nowrap">
                      Now on page 1
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-gray-400">{row.previousPosition.toFixed(1)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink font-medium">{row.position.toFixed(1)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-green font-medium whitespace-nowrap">▲ {row.change.toFixed(1)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{nf.format(row.impressions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
