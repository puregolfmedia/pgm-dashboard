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

/**
 * Up to four one-line headlines, most important first. The comparison period
 * is stated once in the page header, so lines just say "up 18%".
 */
export function buildSummary(d: SummaryInput, _compareLabel?: string): string[] {
  const trend = (change: number | null | undefined) => {
    if (change == null || !Number.isFinite(change)) return ''
    if (change === 0) return ', about the same'
    return `, ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}%`
  }

  const lines: string[] = []
  const m = d.overview?.metrics
  const label = d.overview?.labels?.booking ?? 'booking starts'

  if (m && num(m.sessions.value) > 0) lines.push(`${m.sessions.value} website visits${trend(m.sessions.change)}`)
  if (m && num(m.bookingStarts.value) > 0) lines.push(`${m.bookingStarts.value} ${label === 'booking starts' || label === 'Booking starts' ? 'booking starts' : label} on the website${trend(m.bookingStarts.change)}`)
  const e = d.enquiries?.summary
  if (e?.total > 0) {
    lines.push(`${e.total} enquir${e.total === 1 ? 'y' : 'ies'} received, ${e.booked} booked${e.booked ? ` (${gbp(e.bookedValue)})` : ''}`)
  }
  if (d.email?.campaigns?.length) {
    lines.push(`Emails: ${d.email.avgOpenRate}% opened, ${d.email.avgClickRate}% clicked a link`)
  }
  const p = d.paid?.metrics
  if (p && num(p.spend.value) > 0) {
    lines.push(`${p.spend.value} on Facebook & Instagram ads${p.roas.value !== '—' ? `, returning ${p.roas.value}` : ''}`)
  }
  const s = d.seo?.current
  if (s && s.impressions > 0) {
    const prev = d.seo.previous
    lines.push(`${nf(s.clicks)} visits from Google search${trend(prev ? pctChange(s.clicks, prev.clicks) : null)}`)
  }
  const top = d.overview?.trafficSources?.[0]
  if (top) lines.push(`Most visits came from ${friendlySource(top.source)}`)
  return lines.slice(0, 4)
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
