'use client'

import { useState } from 'react'
import type { LandingPage } from '@/types/dashboard'
import { sectionHelp } from '@/lib/metricHelp'

const SHOWN = 10
const nf = (n: number) => new Intl.NumberFormat('en-GB').format(n)

export default function TopLandingPagesTable({ data, label = 'Clicks' }: { data: LandingPage[]; label?: string }) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? data : data.slice(0, SHOWN)
  const hidden = data.length - SHOWN

  return (
    <div className="bg-white border border-pgm-line rounded-xl overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <h3 className="text-[15px] font-semibold text-pgm-ink">Top landing pages</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          {label === 'Clicks' ? sectionHelp['Top landing pages'] : `The first page people arrived on, how many “${label}” followed, and the conversion % (${label} ÷ visits).`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pgm-cream">
              <th className="text-left px-5 sm:px-6 py-3 font-medium text-pgm-ink">Page</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Visits</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">{label}</th>
              <th className="text-right px-5 sm:px-6 py-3 font-medium text-pgm-ink">Conv. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pgm-line/60">
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">No pages recorded for these dates yet</td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.page + i} className="hover:bg-pgm-page/60">
                <td className="px-5 sm:px-6 py-3 text-gray-700 max-w-xs truncate" title={row.page}>
                  <span className="text-gray-400 tabular-nums mr-3 inline-block w-5 text-right">{i + 1}</span>{row.page}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{nf(row.sessions)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">{nf(row.bookingStarts)}</td>
                <td className="px-5 sm:px-6 py-3 text-right tabular-nums">
                  <span className={row.conversionRate >= 5 ? 'text-pgm-green font-semibold' : 'text-pgm-ink'}>
                    {row.conversionRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <div className="border-t border-pgm-line px-5 sm:px-6 py-3 print:hidden">
          <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}
            className="text-sm font-medium text-pgm-green hover:underline">
            {expanded ? 'Show top 10 only' : `Show ${hidden} more page${hidden === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}
