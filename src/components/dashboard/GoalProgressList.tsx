'use client'

import type { GoalProgress } from '@/lib/goals'

const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const fmt = (metric: GoalProgress['metric'], n: number) => (metric === 'REVENUE' ? gbp(n) : new Intl.NumberFormat('en-GB').format(n))
const unit: Record<GoalProgress['metric'], string> = { ENQUIRIES: 'enquiries', BOOKINGS: 'booked', REVENUE: 'booked' }

const badge: Record<GoalProgress['status'], { text: string; cls: string }> = {
  'done': { text: 'Target reached', cls: 'bg-green-100 text-green-700' },
  'on-track': { text: 'On track', cls: 'bg-green-50 text-green-700' },
  'behind': { text: 'Behind pace', cls: 'bg-amber-50 text-amber-700' },
  'ended': { text: 'Ended', cls: 'bg-gray-100 text-gray-500' },
}

export default function GoalProgressList({ goals }: { goals: GoalProgress[] }) {
  if (goals.length === 0) return null
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
      <h2 className="text-sm font-medium text-pgm-ink">Goals</h2>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">
        Progress towards each target. The small marker shows where you’d expect to be by today if progress were steady.
      </p>
      <div className="space-y-5">
        {goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100)
          const deadline = new Date(g.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          return (
            <div key={g.id}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-pgm-ink">{g.name}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge[g.status].cls}`}>{badge[g.status].text}</span>
              </div>
              <div className="relative h-2.5 bg-gray-100 rounded-full mt-2 overflow-hidden" role="progressbar"
                aria-valuenow={g.current} aria-valuemin={0} aria-valuemax={g.target} aria-label={g.name}>
                <div className="h-full bg-pgm-green rounded-full" style={{ width: `${pct}%` }} />
                {g.status !== 'done' && g.status !== 'ended' && (
                  <div className="absolute top-0 h-full w-0.5 bg-pgm-ink/40" style={{ left: `${g.expectedShare * 100}%` }} />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                <span className="font-medium text-pgm-ink tabular-nums">{fmt(g.metric, g.current)}</span>
                {' '}of {fmt(g.metric, g.target)} {unit[g.metric]}
                {g.category ? ` · ${g.category}` : ''}
                {' · '}
                {g.status === 'ended' ? `ended ${deadline}` : `${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left (${deadline})`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
