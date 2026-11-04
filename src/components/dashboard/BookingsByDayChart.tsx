'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { DailyBooking } from '@/types/dashboard'
import { sectionHelp } from '@/lib/metricHelp'

export interface ChartNote {
  id: string
  date: string // ISO
  text: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const isoToYmd = (iso: string) => iso.slice(0, 10).replace(/-/g, '')

export default function BookingsByDayChart({ data, label = 'Clicks', notes = [] }: {
  data: DailyBooking[]
  /** What the club calls this action, e.g. "Christmas enquiries" */
  label?: string
  /** "What we did" markers to draw on the chart */
  notes?: ChartNote[]
}) {
  const chartData = data.map((d) => ({ ...d, label: formatDate(d.date) }))
  const days = new Set(data.map((d) => d.date))
  // Only mark notes that fall on a day the chart shows
  const visibleNotes = notes.filter((n) => days.has(isoToYmd(n.date)))
  const title = `${label} by day`

  return (
    <div className="bg-white border border-pgm-line rounded-xl p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold text-pgm-ink">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 mb-5 leading-relaxed">
        {label === 'Clicks'
          ? sectionHelp['Clicks by day']
          : `${label} each day, so you can spot busy days and the effect of campaigns.`}
        {visibleNotes.length > 0 && ' Dashed lines mark work we did.'}
      </p>
      {chartData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No data for this period yet</div>
      ) :
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#C6C6C6" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 12 }}
            labelStyle={{ color: '#142019', fontWeight: 500 }}
          />
          {visibleNotes.map((n, i) => (
            <ReferenceLine
              key={n.id}
              x={formatDate(isoToYmd(n.date))}
              stroke="#B8913A"
              strokeDasharray="4 3"
              label={{ value: String(i + 1), position: 'insideTopRight', fill: '#B8913A', fontSize: 10 }}
            />
          ))}
          <Line
            type="linear"
            dataKey="bookings"
            stroke="#084724"
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#084724' }}
            activeDot={{ r: 4, fill: '#084724' }}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>}
      {visibleNotes.length > 0 && (
        <ol className="mt-4 space-y-1">
          {visibleNotes.map((n, i) => (
            <li key={n.id} className="text-xs text-gray-500 flex gap-2">
              <span className="text-[#B8913A] font-semibold tabular-nums">{i + 1}</span>
              <span className="text-gray-400 tabular-nums shrink-0">
                {new Date(n.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span>{n.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
