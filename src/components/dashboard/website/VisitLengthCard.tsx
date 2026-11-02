import { Change } from '@/components/dashboard/MetricCard'
import { pctChange } from '@/lib/utils'
import WidgetCard from './WidgetCard'

const minsSecs = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`

interface Totals { avgSessionDuration: number; pagesPerSession: number; engagementRate: number }

/** How long people stay, and how much of the site they look at. */
export default function VisitLengthCard({ now, prev }: { now: Totals; prev?: Totals }) {
  const engaged = Math.round(now.engagementRate * 100)
  const rows = [
    {
      label: 'Pages looked at per visit',
      value: now.pagesPerSession.toFixed(1),
      change: prev?.pagesPerSession ? pctChange(now.pagesPerSession, prev.pagesPerSession) : 0,
    },
    {
      label: 'Visits where people engaged',
      value: `${engaged}%`,
      change: prev?.engagementRate ? pctChange(now.engagementRate, prev.engagementRate) : 0,
      help: 'Stayed 10 seconds or more, looked at 2+ pages, or enquired.',
    },
  ]
  return (
    <WidgetCard title="Time on the website" intro="How long a typical visit lasts. Longer visits usually mean people are reading menus, prices and details.">
      <p className="text-[40px] leading-none font-semibold text-pgm-ink tabular-nums tracking-tight">{minsSecs(now.avgSessionDuration)}</p>
      <Change change={prev?.avgSessionDuration ? pctChange(now.avgSessionDuration, prev.avgSessionDuration) : 0} />
      <p className="text-xs text-gray-500 mt-1">average visit length</p>

      <div className="flex-1 min-h-6" />
      <div className="space-y-5 pt-5 border-t border-pgm-line">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] text-pgm-ink/80">{r.label}</p>
              <p className="text-lg font-semibold text-pgm-ink tabular-nums">{r.value}</p>
            </div>
            {r.help && (
              <div className="h-1.5 bg-pgm-cream rounded-full mt-2 overflow-hidden" aria-hidden>
                <div className="h-full bg-pgm-green rounded-full" style={{ width: `${engaged}%` }} />
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              {r.help ? <p className="text-[11.5px] text-gray-500 mt-1.5 leading-snug">{r.help}</p> : <span />}
              <span className="shrink-0 whitespace-nowrap"><Change change={r.change} /></span>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
