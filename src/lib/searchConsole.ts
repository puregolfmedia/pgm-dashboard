import { JWT } from 'google-auth-library'
import { decrypt } from './crypto'
import { toRange, type DateRange } from './dateRange'

// Google Search Console (Search Analytics API), authenticated with the same
// service account as GA4. That account must be added as a user on the
// club's Search Console property, and the Search Console API enabled in its
// Google Cloud project.

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export interface SearchTotals {
  clicks: number
  impressions: number
  ctr: number      // percent, 0–100
  position: number // average ranking position (lower is better)
}

export interface SearchRow extends SearchTotals {
  key: string
}

export interface SearchMover {
  key: string
  previousPosition: number
  position: number
  change: number       // places gained (positive = moved up Google)
  impressions: number  // times shown in the current period
  newOnPage1: boolean  // was below position 10, now on page 1
}

export interface SearchConsoleData {
  current: SearchTotals
  previous: SearchTotals
  topQueries: SearchRow[]
  topPages: SearchRow[]
  topMovers?: SearchMover[]
  startDate: string
  endDate: string
}

// Searches that moved up Google between the previous period and this one.
// Only searches shown at least MIN_SHOWN times in both periods count, so one
// stray search can't create a big "move". Searches containing the club's own
// name are left out: they rank at the top already, so they say nothing new.
const MIN_SHOWN = 3
const MAX_MOVERS = 6

function brandStem(siteUrl: string): string | null {
  const host = siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '')
  const label = host.split('.')[0].toLowerCase().replace(/golfclub|golfcourse|golf|club|country|resort|estate/g, '')
  return label.length >= 4 ? label.slice(0, 5) : null
}

export function topMovers(siteUrl: string, current: SearchRow[], previous: SearchRow[]): SearchMover[] {
  const stem = brandStem(siteUrl)
  const before = new Map(previous.map((r) => [r.key.toLowerCase(), r]))
  return current
    .filter((r) => r.impressions >= MIN_SHOWN && (!stem || !r.key.toLowerCase().includes(stem)))
    .flatMap((r) => {
      const p = before.get(r.key.toLowerCase())
      if (!p || p.impressions < MIN_SHOWN) return []
      const change = Math.round((p.position - r.position) * 10) / 10
      if (change < 1) return []
      return [{ key: r.key, previousPosition: p.position, position: r.position, change, impressions: r.impressions, newOnPage1: p.position > 10 && r.position <= 10 }]
    })
    .sort((a, b) => Number(b.newOnPage1) - Number(a.newOnPage1) || b.change - a.change || b.impressions - a.impressions)
    .slice(0, MAX_MOVERS)
}

async function query(client: JWT, siteUrl: string, body: Record<string, unknown>): Promise<any[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const res = await client.request<{ rows?: any[] }>({ url, method: 'POST', data: body })
  return res.data.rows ?? []
}

function toTotals(row: any | undefined): SearchTotals {
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: Math.round((row?.ctr ?? 0) * 1000) / 10,
    position: Math.round((row?.position ?? 0) * 10) / 10,
  }
}

export async function fetchSearchConsole(
  siteUrl: string,
  encryptedServiceAccountJson: string,
  days: number | DateRange = 30,
  /** Golf or clubhouse view: only results for pages whose address contains one of these words */
  pageWords?: string[] | null
): Promise<SearchConsoleData> {
  const creds = JSON.parse(decrypt(encryptedServiceAccountJson))
  const client = new JWT({ email: creds.client_email, key: creds.private_key, scopes: [SCOPE] })

  // Search Console data runs ~2 days behind, so end the window there to avoid
  // a misleading dip from incomplete days. Presets shift back by 2 days;
  // custom ranges are cut off at the latest complete day.
  const r = toRange(days)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const shift = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d }
  const latest = shift(fmt(new Date()), -2)
  const lag = r.custom ? 0 : -2
  let start = shift(r.start, lag), end = shift(r.end, lag)
  if (end > latest) end = latest
  if (start > end) start = end
  const prevStart = shift(r.prevStart, lag), prevEnd = shift(r.prevEnd, lag)

  const range = { startDate: fmt(start), endDate: fmt(end) }

  const prevRange = { startDate: fmt(prevStart), endDate: fmt(prevEnd) }
  const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const scope = pageWords?.length
    ? { dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'includingRegex', expression: `(?i)(${pageWords.map(escape).join('|')})` }] }] }
    : {}

  const [current, previous, queries, pages, allQueries, prevQueries] = await Promise.all([
    query(client, siteUrl, { ...range, ...scope }),
    query(client, siteUrl, { ...prevRange, ...scope }),
    query(client, siteUrl, { ...range, ...scope, dimensions: ['query'], rowLimit: 25 }),
    query(client, siteUrl, { ...range, ...scope, dimensions: ['page'], rowLimit: 25 }),
    query(client, siteUrl, { ...range, ...scope, dimensions: ['query'], rowLimit: 1000 }),
    query(client, siteUrl, { ...prevRange, ...scope, dimensions: ['query'], rowLimit: 1000 }),
  ])

  const toRows = (rows: any[]): SearchRow[] =>
    rows.map((r) => ({ key: r.keys?.[0] ?? '', ...toTotals(r) }))

  return {
    current: toTotals(current[0]),
    previous: toTotals(previous[0]),
    topQueries: toRows(queries),
    topPages: toRows(pages),
    topMovers: topMovers(siteUrl, toRows(allQueries), toRows(prevQueries)),
    startDate: range.startDate,
    endDate: range.endDate,
  }
}
