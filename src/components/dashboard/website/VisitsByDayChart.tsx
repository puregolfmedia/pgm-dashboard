'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Change } from '@/components/dashboard/MetricCard'
import { pctChange } from '@/lib/utils'
import WidgetCard from './WidgetCard'

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const dayLabel = (ymd: string) =>
  new Date(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

interface Props {
  daily: { date: string; sessions: number; previous: number }[]
  totals: { sessions: number; totalUsers: number; newUsers: number }
  previous?: { sessions: number; totalUsers: number; newUsers: number }
  /** e.g. "the previous 30 days" */
  compareName: string
  className?: string
}

/** Website visits each day, with the comparison period as a faint dashed line behind. */
export default function VisitsByDayChart({ daily, totals, previous, compareName, className }: Props) {
  const data = daily.map((d) => ({ ...d, label: dayLabel(d.date) }))
  const hasPrev = daily.some((d) => d.previous > 0)
  const stats = [
    { label: 'Visits', value: totals.sessions, prev: previous?.sessions },
    { label: 'People', value: totals.totalUsers, prev: previous?.totalUsers },
    { label: 'First-time visitors', value: totals.newUsers, prev: previous?.newUsers },
  ]

  return (
    <WidgetCard className={className} title="Website visits by day"
      intro={`Each visit to the website, day by day.${hasPrev ? ` The dashed line is ${compareName}, for comparison.` : ''} One person can make several visits.`}>
      <dl className="grid grid-cols-3 gap-4 mb-5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-gray-500">{s.label}</dt>
            <dd className="text-2xl font-semibold text-pgm-ink tabular-nums tracking-tight mt-1">{nf(s.value)}</dd>
            {s.prev ? <dd><Change change={pctChange(s.value, s.prev)} /></dd> : null}
          </div>
        ))}
      </dl>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No visits recorded for these dates yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E3E8E4" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A948D' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: '#8A948D' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #D9DFDA', fontSize: 12 }}
              labelStyle={{ color: '#142019', fontWeight: 600 }}
              formatter={(v: any, name: any) => [nf(Number(v)), String(name)]}
            />
            {hasPrev && (
              <Line type="monotone" dataKey="previous" name={`Same day, ${compareName}`} stroke="#A9B4AC" strokeWidth={1.5}
                strokeDasharray="4 4" dot={false} activeDot={false} />
            )}
            <Line type="monotone" dataKey="sessions" name="Visits" stroke="#084724" strokeWidth={2.25} dot={false}
              activeDot={{ r: 4, fill: '#084724', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  )
}
