'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Change } from '@/components/dashboard/MetricCard'
import WidgetCard from '@/components/dashboard/website/WidgetCard'
import { channelName } from '@/lib/channels'

const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const gbpShort = (n: number) => (n >= 1000 ? `£${Math.round(n / 1000)}k` : gbp(n))
const nf = (n: number) => new Intl.NumberFormat('en-GB').format(n)
const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

export interface MembershipData {
  goal: { baseline: number | null; target: number | null; targetDate: string | null }
  history: { date: string; value: number; members: number | null }[]
  enquiries: {
    label: string
    total: number
    change: number
    daily: { date: string; bookings: number }[]
    channels: { channel: string; count: number }[]
  } | null
}

/** Membership value against its target, and the website enquiries feeding it. */
export default function MembershipTracker({ data, compare, isAdmin }: { data: MembershipData; compare: string; isAdmin: boolean }) {
  const { goal, history, enquiries } = data
  const latest = history[history.length - 1]
  const hasGoal = goal.baseline != null && goal.target != null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
      {hasGoal || latest ? (
        <ValueCard className={enquiries ? 'lg:col-span-2' : 'lg:col-span-3'} goal={goal} history={history} />
      ) : isAdmin ? (
        <p className="lg:col-span-2 text-sm text-gray-500 bg-white border border-dashed border-pgm-line rounded-xl p-5">
          Add the club’s membership value target and monthly figures in its admin settings to show progress here.
        </p>
      ) : null}
      {enquiries && <EnquiriesCard data={enquiries} compare={compare} />}
    </div>
  )
}

function ValueCard({ goal, history, className }: { goal: MembershipData['goal']; history: MembershipData['history']; className: string }) {
  const latest = history[history.length - 1]
  const first = history[0]
  const current = latest?.value ?? goal.baseline ?? 0
  const base = goal.baseline ?? first?.value ?? 0
  const target = goal.target
  const span = target != null ? target - base : 0
  const share = span > 0 ? Math.max(0, Math.min(1, (current - base) / span)) : 0
  const gained = current - base
  // Where steady progress would have the club by now, from the first figure to the target date
  const startTime = first ? new Date(first.date).getTime() : null
  const endTime = goal.targetDate ? new Date(goal.targetDate).getTime() : null
  const expected = startTime && endTime && endTime > startTime
    ? Math.max(0, Math.min(1, (Date.now() - startTime) / (endTime - startTime))) : null
  const memberChange = latest?.members != null && first?.members != null ? latest.members - first.members : null
  const chart = history.map((h) => ({ label: monthYear(h.date), value: h.value, members: h.members }))

  return (
    <WidgetCard className={className} title="Membership value"
      intro="The total yearly value of the club’s memberships, updated monthly, against the club’s target.">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[40px] leading-none font-semibold text-pgm-ink tabular-nums tracking-tight">{gbp(current)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {latest ? `as of ${monthYear(latest.date)}` : 'starting value'}
            {latest?.members != null && <> · {nf(latest.members)} members{memberChange ? ` (${memberChange > 0 ? '+' : ''}${memberChange})` : ''}</>}
          </p>
        </div>
        {target != null && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Target</p>
            <p className="text-xl font-semibold text-pgm-green tabular-nums">{gbp(target)}</p>
            {goal.targetDate && <p className="text-xs text-gray-500">by {monthYear(goal.targetDate)}</p>}
          </div>
        )}
      </div>

      {target != null && span > 0 && (
        <div className="mt-6">
          <div className="relative h-3.5 bg-pgm-cream rounded-full overflow-hidden" role="progressbar"
            aria-valuemin={base} aria-valuemax={target} aria-valuenow={current} aria-label="Progress towards the membership value target">
            <div className="h-full bg-pgm-green rounded-full transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
            {expected !== null && expected < 1 && (
              <span className="absolute top-0 bottom-0 w-0.5 bg-pgm-gold" style={{ left: `${expected * 100}%` }} title="Where steady progress would be by now" />
            )}
          </div>
          <div className="flex justify-between text-[11.5px] text-gray-500 mt-1.5 tabular-nums">
            <span>{gbpShort(base)} start</span>
            <span>{gbpShort(target)}</span>
          </div>
          <p className="text-sm text-pgm-ink mt-3">
            {gained > 0 ? <><strong className="text-pgm-green">{gbp(gained)}</strong> added since the start — {Math.round(share * 100)}% of the way. </>
              : gained < 0 ? <><strong className="text-[#B4432F]">{gbp(-gained)}</strong> down on the start. </> : null}
            {target - current > 0 ? <>{gbp(target - current)} still to go.</> : <strong className="text-pgm-green">Target reached.</strong>}
            {expected !== null && expected < 1 && (
              <span className="text-gray-500"> The gold mark shows where steady progress would be by now{share >= expected ? ', so the club is ahead of pace.' : '.'}</span>
            )}
          </p>
        </div>
      )}

      {chart.length >= 2 && (
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chart} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E3E8E4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A948D' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8A948D' }} tickLine={false} axisLine={false} width={52}
                domain={['dataMin - 5000', 'dataMax + 5000']} tickFormatter={(v: number) => gbpShort(v)} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D9DFDA', fontSize: 12 }}
                formatter={(v: any, _n: any, item: any) => [`${gbp(Number(v))}${item?.payload?.members != null ? ` · ${nf(item.payload.members)} members` : ''}`, 'Membership value']} />
              <Line type="monotone" dataKey="value" stroke="#084724" strokeWidth={2.25} dot={{ r: 3, fill: '#084724' }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  )
}

function EnquiriesCard({ data, compare }: { data: NonNullable<MembershipData['enquiries']>; compare: string }) {
  const max = Math.max(1, ...data.channels.map((c) => c.count))
  return (
    <WidgetCard title={data.label} intro="Membership enquiries sent from the website, and where those visitors came from.">
      <p className="text-[40px] leading-none font-semibold text-pgm-ink tabular-nums tracking-tight">{nf(data.total)}</p>
      <Change change={data.change} />
      <p className="text-xs text-gray-500 mt-1">{compare.replace(/^vs /, 'compared with ')}</p>
      {data.channels.length > 0 ? (
        <ul className="mt-6 pt-5 border-t border-pgm-line space-y-3">
          {data.channels.map((c, i) => (
            <li key={c.channel}>
              <div className="flex justify-between text-[13px]">
                <span className="text-pgm-ink">{channelName(c.channel)}</span>
                <span className="font-semibold text-pgm-ink tabular-nums">{nf(c.count)}</span>
              </div>
              <div className="h-1.5 bg-pgm-cream rounded-full mt-1.5 overflow-hidden" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, background: i === 0 ? '#084724' : '#7FA58C' }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 mt-6 pt-5 border-t border-pgm-line">No membership enquiries recorded for these dates yet.</p>
      )}
    </WidgetCard>
  )
}
