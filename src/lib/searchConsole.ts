import { JWT } from 'google-auth-library'
import { decrypt } from './crypto'

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

export interface SearchConsoleData {
  current: SearchTotals
  previous: SearchTotals
  topQueries: SearchRow[]
  topPages: SearchRow[]
  startDate: string
  endDate: string
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
  days = 30
): Promise<SearchConsoleData> {
  const creds = JSON.parse(decrypt(encryptedServiceAccountJson))
  const client = new JWT({ email: creds.client_email, key: creds.private_key, scopes: [SCOPE] })

  // Search Console data runs ~2 days behind, so end the window there to avoid
  // a misleading dip from incomplete days.
  const end = new Date()
  end.setDate(end.getDate() - 2)
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  const prevEnd = new Date(start)
  prevEnd.setDate(start.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevEnd.getDate() - (days - 1))
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const range = { startDate: fmt(start), endDate: fmt(end) }

  const [current, previous, queries, pages] = await Promise.all([
    query(client, siteUrl, { ...range }),
    query(client, siteUrl, { startDate: fmt(prevStart), endDate: fmt(prevEnd) }),
    query(client, siteUrl, { ...range, dimensions: ['query'], rowLimit: 25 }),
    query(client, siteUrl, { ...range, dimensions: ['page'], rowLimit: 25 }),
  ])

  const toRows = (rows: any[]): SearchRow[] =>
    rows.map((r) => ({ key: r.keys?.[0] ?? '', ...toTotals(r) }))

  return {
    current: toTotals(current[0]),
    previous: toTotals(previous[0]),
    topQueries: toRows(queries),
    topPages: toRows(pages),
    startDate: range.startDate,
    endDate: range.endDate,
  }
}
