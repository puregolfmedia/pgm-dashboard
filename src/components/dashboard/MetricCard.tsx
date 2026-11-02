import { metricHelp } from '@/lib/metricHelp'

interface MetricCardProps {
  label: string
  /** Plain-English explanation; defaults to the glossary entry for the label */
  help?: string
  value: string
  change: number
  changePeriod?: string
  loading?: boolean
}

/** One figure: its name, the number, what it means, and how it changed. */
export default function MetricCard({ label, help, value, change, changePeriod, loading }: MetricCardProps) {
  const explanation = help ?? metricHelp[label]
  if (loading) {
    return (
      <div className="bg-white border border-pgm-line rounded-xl p-5 animate-pulse" aria-busy="true">
        <div className="h-3.5 bg-pgm-cream rounded w-28 mb-4" />
        <div className="h-8 bg-pgm-cream rounded w-24 mb-3" />
        <div className="h-3 bg-pgm-cream rounded w-40" />
      </div>
    )
  }

  return (
    <div className="bg-white border border-pgm-line rounded-xl p-5 flex flex-col">
      <p className="text-[13px] font-medium text-pgm-ink/70">{label}</p>
      <p className="text-[32px] leading-none font-semibold text-pgm-ink tabular-nums tracking-tight mt-3">{value}</p>
      <Change change={change} period={changePeriod} />
      {explanation && <p className="text-xs text-gray-500 leading-relaxed mt-3 pt-3 border-t border-pgm-line/70">{explanation}</p>}
    </div>
  )
}

export function Change({ change, period, light = false }: { change: number; period?: string; light?: boolean }) {
  if (!change && !period) return null
  const up = change > 0
  const colour = !change ? '' : up ? (light ? 'text-[#7FD3A0]' : 'text-[#1E7A45]') : (light ? 'text-[#F2A38F]' : 'text-[#B4432F]')
  return (
    <p className={`text-xs mt-2 ${light ? 'text-white/60' : 'text-gray-500'}`}>
      {change !== 0 && (
        <span className={`font-semibold ${colour}`}>
          <span aria-hidden>{up ? '▲' : '▼'}</span> {up ? 'up' : 'down'} {Math.abs(change)}%
        </span>
      )}
      {change !== 0 && period ? ' ' : ''}{period}
    </p>
  )
}
