import { pctChange } from '@/lib/utils'

// Plain-English "in brief" lines for the top of a club's dashboard, built
// from whatever data sources the club has connected.

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const num = (v: unknown) => (typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : typeof v === 'number' ? v : NaN)

export interface SummaryInput {
  overview?: any
  enquiries?: any
  email?: any
  emailSince?: string | null
  paid?: any
  seo?: any
}

export function buildSummary(d: SummaryInput, compareLabel: string): string[] {
  // "up 18% vs prior 30 days" / "the same as …"
  const trend = (change: number | null | undefined) => {
    if (change == null || !Number.isFinite(change)) return ''
    if (change === 0) return ` — about the same (${compareLabel})`
    return ` — ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% ${compareLabel}`
  }

  const lines: string[] = []
  const m = d.overview?.metrics
  const label = d.overview?.labels?.booking ?? 'booking starts'

  if (m && num(m.sessions.value) > 0) {
    lines.push(`${m.sessions.value} visits to the website${trend(m.sessions.change)}.`)
    const top = d.overview.trafficSources?.[0]
    if (top) lines.push(`Most visits came from ${friendlySource(top.source)}.`)
  }
  if (m && num(m.bookingStarts.value) > 0) {
    lines.push(`${m.bookingStarts.value} ${label} recorded on the website${trend(m.bookingStarts.change)}.`)
  }
  const e = d.enquiries
  if (e?.summary?.total > 0) {
    const booked = e.summary.booked
    lines.push(`${e.summary.total} enquir${e.summary.total === 1 ? 'y' : 'ies'} received, ${booked} booked${booked ? ` (worth ${gbp(e.summary.bookedValue)})` : ''}.`)
    if (e.summary.open > 0) lines.push(`${e.summary.open} enquir${e.summary.open === 1 ? 'y is' : 'ies are'} still to be followed up.`)
  }
  if (d.email?.campaigns?.length) {
    const n = d.email.campaigns.length
    const since = d.emailSince ? ` since ${new Date(d.emailSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : ''
    lines.push(`${n} email${n === 1 ? '' : 's'} sent${since}: on average ${d.email.avgOpenRate}% of people opened them and ${d.email.avgClickRate}% clicked a link.`)
  }
  const p = d.paid?.metrics
  if (p && num(p.spend.value) > 0) {
    lines.push(`${p.spend.value} spent on Facebook & Instagram ads, shown ${p.impressions.value} times and clicked ${p.clicks.value} times${p.roas.value !== '—' ? `, returning ${p.roas.value} the spend` : ''}.`)
  }
  const s = d.seo?.current
  if (s && s.impressions > 0) {
    const prev = d.seo.previous
    lines.push(`${nf(s.clicks)} people clicked through to the website from Google search${trend(prev ? pctChange(s.clicks, prev.clicks) : null)}.`)
  }
  return lines
}

/** GA4 channel names in everyday words. */
export function friendlySource(source: string) {
  const map: Record<string, string> = {
    'Organic Search': 'Google search (not ads)',
    'Direct': 'people typing the address or using a bookmark',
    'Paid Social': 'Facebook & Instagram ads',
    'Organic Social': 'social media posts',
    'Paid Search': 'Google ads',
    'Email': 'emails',
    'Referral': 'links on other websites',
    'Unassigned': 'unknown sources',
  }
  return map[source] ?? source
}
