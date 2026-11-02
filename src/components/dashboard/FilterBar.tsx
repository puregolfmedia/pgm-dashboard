'use client'

import { useEffect, useState } from 'react'
import { rangeQuery } from '@/lib/dateRange'

export interface RangeValue {
  days: number
  from?: string
  to?: string
  compare: 'previous' | 'year'
}

const DATE_OPTIONS = [
  { label: 'Last 7 days',  value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const STORAGE_KEY = 'pgm-date-range'
const DEFAULT: RangeValue = { days: 30, compare: 'previous' }

/** The chosen dates, remembered while moving between tabs (this browser only). */
export function useDateRange(initial: RangeValue = DEFAULT) {
  const [range, setRange] = useState<RangeValue>(initial)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
      if (saved && typeof saved.days === 'number') setRange(saved)
    } catch { /* storage unavailable — use the default */ }
  }, [])
  const update = (r: RangeValue) => {
    setRange(r)
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r)) } catch { /* ignore */ }
  }
  return [range, update, rangeQuery(range)] as const
}

export function compareText(r: RangeValue) {
  if (r.compare === 'year') return 'vs same dates last year'
  return r.from && r.to ? 'vs the period before' : `vs prior ${r.days} days`
}

const daysInclusive = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000) + 1

interface FilterBarProps {
  value: RangeValue
  onChange: (r: RangeValue) => void
}

export default function FilterBar({ value, onChange }: FilterBarProps) {
  const isCustom = !!(value.from && value.to)
  const [showCustom, setShowCustom] = useState(isCustom)
  const [from, setFrom] = useState(value.from ?? '')
  const [to, setTo] = useState(value.to ?? '')
  // Keep the boxes in step when the remembered range loads after the first render
  useEffect(() => {
    setFrom(value.from ?? '')
    setTo(value.to ?? '')
    if (value.from && value.to) setShowCustom(true)
  }, [value.from, value.to])
  const today = new Date().toISOString().slice(0, 10)
  const btn = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    active ? 'bg-pgm-green text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-pgm-green hover:text-pgm-green'}`

  const applyCustom = () => {
    if (!from || !to || from > to) return
    onChange({ days: daysInclusive(from, to), from, to, compare: value.compare })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DATE_OPTIONS.map((opt) => (
        <button key={opt.value} className={btn(!isCustom && value.days === opt.value)}
          onClick={() => { setShowCustom(false); onChange({ days: opt.value, compare: value.compare }) }}>
          {opt.label}
        </button>
      ))}
      <button className={btn(isCustom || showCustom)} onClick={() => setShowCustom((s) => !s)} aria-expanded={showCustom}>
        Custom dates
      </button>
      {showCustom && (
        <span className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
          <input type="date" aria-label="From" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)}
            className="text-xs text-pgm-ink bg-transparent" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" aria-label="To" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)}
            className="text-xs text-pgm-ink bg-transparent" />
          <button onClick={applyCustom} disabled={!from || !to || from > to}
            className="text-xs font-medium text-pgm-green hover:underline disabled:text-gray-300 disabled:no-underline ml-1">Apply</button>
        </span>
      )}
      <select aria-label="Compare with" value={value.compare}
        onChange={(e) => onChange({ ...value, compare: e.target.value as RangeValue['compare'] })}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 bg-white">
        <option value="previous">Compare with the period before</option>
        <option value="year">Compare with last year</option>
      </select>
    </div>
  )
}
