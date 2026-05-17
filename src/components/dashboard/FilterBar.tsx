'use client'

const DATE_OPTIONS = [
  { label: 'Last 7 days',  value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

interface FilterBarProps {
  days: number
  onDaysChange: (days: number) => void
}

export default function FilterBar({ days, onDaysChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DATE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onDaysChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            days === opt.value
              ? 'bg-pgm-green text-white'
              : 'bg-white border border-gray-200 text-gray-500 hover:border-pgm-green hover:text-pgm-green'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
