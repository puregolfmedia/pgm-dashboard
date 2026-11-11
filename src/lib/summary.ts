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
  membership?: any
}

export interface BriefItem {
  /** Icon name, see components/ui/Icon */
  icon: string
  /** The headline, kept to one short line */
  text: string
  /** % change against the comparison period; 0 means none worth showing */
  change: number
  /** Section of the page this line is about */
  target: string
}

/** Up to four one-line headlines, most important first. */
export function buildSummary(d: SummaryInput, _compareLabel?: string): BriefItem[] {
  const items: BriefItem[] = []
  const m = d.overview?.metrics
  const label = d.overview?.labels?.booking ?? 'clicks'
  const named = label === 'clicks' || label === 'Clicks' ? 'clicks to book or enquire' : label

  // Membership value first: it's the club's main goal
  const mv = d.membership
  const latest = mv?.history?.[mv.history.length - 1]
  if (latest && mv.goal?.target) {
    const base = mv.goal.baseline ?? mv.history[0].value
    const pct = mv.goal.target > base ? Math.round(((latest.value - base) / (mv.goal.target - base)) * 100) : 0
    items.push({ icon: 'goals', text: `Membership value ${gbp(latest.value)}, ${Math.max(0, pct)}% of the way to ${gbp(mv.goal.target)}`, change: 0, target: 'membership' })
  }

  if (m && num(m.sessions.value) > 0) {
    items.push({ icon: 'website', text: `${m.sessions.value} website visits`, change: m.sessions.change ?? 0, target: 'website' })
  }
  if (m && num(m.bookingStarts.value) > 0) {
    items.push({ icon: 'click', text: named === 'clicks to book or enquire' ? `${m.bookingStarts.value} ${named}` : `${m.bookingStarts.value} ${named} online`, change: m.bookingStarts.change ?? 0, target: 'website' })
  }
  const e = d.enquiries?.summary
  if (e?.total > 0) {
    const prev = d.enquiries?.previous?.total
    items.push({
      icon: 'enquiries',
      text: `${e.total} enquir${e.total === 1 ? 'y' : 'ies'}, ${e.booked} booked${e.booked ? ` (${gbp(e.bookedValue)})` : ''}`,
      change: prev ? pctChange(e.total, prev) : 0,
      target: 'enquiries',
    })
  }
  if (d.email?.campaigns?.length) {
    items.push({ icon: 'email', text: `Emails: ${d.email.avgOpenRate}% opened, ${d.email.avgClickRate}% clicked`, change: 0, target: 'email' })
  }
  const p = d.paid?.metrics
  if (p && num(p.spend.value) > 0) {
    items.push({ icon: 'ads', text: `${p.spend.value} on social ads${p.roas.value !== '—' ? `, returning ${p.roas.value}` : ''}`, change: 0, target: 'ads' })
  }
  const s = d.seo?.current
  if (s && s.impressions > 0) {
    const prev = d.seo.previous
    items.push({ icon: 'search', text: `${nf(s.clicks)} visits from Google search`, change: prev ? pctChange(s.clicks, prev.clicks) : 0, target: 'google' })
  }
  const top = d.overview?.trafficSources?.[0]
  if (top) items.push({ icon: 'sources', text: `Most visits came from ${friendlySource(top.source)}`, change: 0, target: 'website' })
  return items.slice(0, 4)
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
