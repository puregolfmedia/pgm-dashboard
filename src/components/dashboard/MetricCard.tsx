interface MetricCardProps {
  label: string
  value: string
  change: number
  changePeriod?: string
  loading?: boolean
}

export default function MetricCard({ label, value, change, changePeriod, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5 animate-pulse">
        <div className="h-3.5 bg-gray-100 rounded w-24 mb-4" />
        <div className="h-8 bg-gray-100 rounded w-32 mb-3" />
        <div className="h-5 bg-gray-100 rounded w-20" />
      </div>
    )
  }

  const isPositive = change > 0
  const isNeutral = change === 0

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-semibold text-pgm-ink mb-3 tabular-nums">{value}</p>
      <div className="flex items-center gap-2">
        {!isNeutral && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
        {changePeriod && (
          <span className="text-xs text-gray-400">{changePeriod}</span>
        )}
      </div>
    </div>
  )
}
