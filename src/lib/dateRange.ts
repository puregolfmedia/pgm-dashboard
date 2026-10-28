// One definition of "which dates" for every tab: a preset (last N days) or a
// custom from–to, compared with either the period just before or the same
// dates a year earlier. Dates are YYYY-MM-DD strings.

export interface DateRange {
  start: string
  end: string
  prevStart: string
  prevEnd: string
  days: number
  custom: boolean
  compare: 'previous' | 'year'
  /** Stable text for cache keys */
  key: string
  /** e.g. "vs prior 30 days" or "vs same dates last year" */
  compareLabel: string
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const parse = (s: string) => new Date(`${s}T12:00:00Z`)
const addDays = (s: string, n: number) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d) }
const addYears = (s: string, n: number) => { const d = parse(s); d.setUTCFullYear(d.getUTCFullYear() + n); return fmt(d) }
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000)

export function buildRange(opts: { days?: number; from?: string | null; to?: string | null; compare?: string | null }): DateRange {
  const today = fmt(new Date())
  const compare: DateRange['compare'] = opts.compare === 'year' ? 'year' : 'previous'

  let start: string, end: string, custom = false
  if (opts.from && opts.to && ISO.test(opts.from) && ISO.test(opts.to) && opts.from <= opts.to) {
    end = opts.to > today ? today : opts.to
    start = opts.from > end ? end : opts.from
    if (daysBetween(start, end) > 400) start = addDays(end, -400)
    custom = true
  } else {
    const days = Math.min(Math.max(Math.round(opts.days ?? 30) || 30, 1), 366)
    end = today
    start = addDays(today, -(days - 1)) // N calendar days including today
  }

  const days = daysBetween(start, end) + 1
  const prevStart = compare === 'year' ? addYears(start, -1) : addDays(start, -(days))
  const prevEnd = compare === 'year' ? addYears(end, -1) : addDays(start, -1)

  return {
    start, end, prevStart, prevEnd, days, custom, compare,
    key: `${start}_${end}_${compare}`,
    compareLabel: compare === 'year' ? 'vs same dates last year' : custom ? 'vs the period before' : `vs prior ${days} days`,
  }
}

/** Read ?days= or ?from=&to=, plus ?compare=year, from a request. */
export function rangeFromParams(params: URLSearchParams, defaultDays = 30): DateRange {
  return buildRange({
    days: params.has('days') ? parseInt(params.get('days')!) : defaultDays,
    from: params.get('from'),
    to: params.get('to'),
    compare: params.get('compare'),
  })
}

/** Accept either a number of days (older callers) or a DateRange. */
export function toRange(daysOrRange: number | DateRange): DateRange {
  return typeof daysOrRange === 'number' ? buildRange({ days: daysOrRange }) : daysOrRange
}

/** Query-string fragment for the browser to send, e.g. "days=30" or "from=…&to=…&compare=year". */
export function rangeQuery(r: { days: number; from?: string; to?: string; compare?: 'previous' | 'year' }) {
  const parts = r.from && r.to ? [`from=${r.from}`, `to=${r.to}`] : [`days=${r.days}`]
  if (r.compare === 'year') parts.push('compare=year')
  return parts.join('&')
}
