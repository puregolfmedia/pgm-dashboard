import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { decrypt } from './crypto'
import { toRange, type DateRange } from './dateRange'
import type { DailyBooking, LandingPage, TrafficSource } from '@/types/dashboard'

function getClient(encryptedServiceAccountJson: string): BetaAnalyticsDataClient {
  const json = JSON.parse(decrypt(encryptedServiceAccountJson))
  return new BetaAnalyticsDataClient({ credentials: json })
}

interface GA4OverviewResult {
  current: {
    sessions: number
    bookingStarts: number
    bounceRate: number
    avgSessionDuration: number
  }
  previous: {
    sessions: number
    bookingStarts: number
  }
}

export async function fetchGA4Overview(
  propertyId: string,
  encryptedServiceAccountJson: string,
  bookingEventName: string,
  days: number | DateRange = 30
): Promise<GA4OverviewResult> {
  const client = getClient(encryptedServiceAccountJson)

  const r = toRange(days)

  // Also fetch booking event count separately (event count filtered by name)
  const [bookingResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: r.start, endDate: r.end, name: 'current' },
      { startDate: r.prevStart, endDate: r.prevEnd, name: 'previous' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: bookingEventName, matchType: 'EXACT' },
      },
    },
  })

  const [sessionsResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: r.start, endDate: r.end, name: 'current' },
      { startDate: r.prevStart, endDate: r.prevEnd, name: 'previous' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
  })

  const getMetric = (rows: any[], dateRangeName: string, metricIndex: number) => {
    const row = rows?.find((r: any) => r.dimensionValues?.[0]?.value === dateRangeName)
    return parseFloat(row?.metricValues?.[metricIndex]?.value ?? '0')
  }

  const sRows = sessionsResponse.rows ?? []
  const bRows = bookingResponse.rows ?? []

  return {
    current: {
      sessions: getMetric(sRows, 'current', 0),
      bounceRate: getMetric(sRows, 'current', 1),
      avgSessionDuration: getMetric(sRows, 'current', 2),
      bookingStarts: getMetric(bRows, 'current', 0),
    },
    previous: {
      sessions: getMetric(sRows, 'previous', 0),
      bookingStarts: getMetric(bRows, 'previous', 0),
    },
  }
}

export async function fetchGA4DailyBookings(
  propertyId: string,
  encryptedServiceAccountJson: string,
  bookingEventName: string,
  days: number | DateRange = 30
): Promise<DailyBooking[]> {
  const client = getClient(encryptedServiceAccountJson)
  const { start, end } = toRange(days)
  const fmt = (d: string) => d

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: bookingEventName, matchType: 'EXACT' },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  })

  const counts = new Map<string, number>()
  for (const row of response.rows ?? []) {
    counts.set(row.dimensionValues?.[0]?.value ?? '', parseInt(row.metricValues?.[0]?.value ?? '0'))
  }
  if (counts.size === 0) return []

  // GA4 leaves out days with no bookings, which made the chart skip over them.
  // Fill every day from the first recorded booking to today, using 0 where empty.
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const first = Array.from(counts.keys()).sort()[0]
  const day = new Date(`${first.slice(0, 4)}-${first.slice(4, 6)}-${first.slice(6, 8)}T12:00:00Z`)
  const last = end.replace(/-/g, '')
  const result: DailyBooking[] = []
  while (ymd(day) <= last) {
    result.push({ date: ymd(day), bookings: counts.get(ymd(day)) ?? 0 })
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return result
}

export async function fetchGA4TrafficSources(
  propertyId: string,
  encryptedServiceAccountJson: string,
  days: number | DateRange = 30
): Promise<TrafficSource[]> {
  const client = getClient(encryptedServiceAccountJson)
  const { start, end } = toRange(days)
  const fmt = (d: string) => d

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 8,
  })

  return (response.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value ?? '0'),
  }))
}

export async function fetchGA4LandingPages(
  propertyId: string,
  encryptedServiceAccountJson: string,
  bookingEventName: string,
  days: number | DateRange = 30
): Promise<LandingPage[]> {
  const client = getClient(encryptedServiceAccountJson)
  const { start, end } = toRange(days)
  const fmt = (d: string) => d

  const notSetFilter = {
    notExpression: {
      filter: {
        fieldName: 'landingPagePlusQueryString',
        stringFilter: { value: '(not set)', matchType: 'EXACT' as const },
      },
    },
  }

  // Sessions per landing page, and booking events per landing page, fetched
  // separately: an unfiltered eventCount counts every event (page views,
  // scrolls…), not just bookings.
  const [[response], [bookingResponse]] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: notSetFilter,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            notSetFilter,
            {
              filter: {
                fieldName: 'eventName',
                stringFilter: { value: bookingEventName, matchType: 'EXACT' as const },
              },
            },
          ],
        },
      },
      limit: 1000,
    }),
  ])

  const bookingMap = new Map<string, number>()
  for (const row of bookingResponse.rows ?? []) {
    bookingMap.set(row.dimensionValues?.[0]?.value ?? '', parseInt(row.metricValues?.[0]?.value ?? '0'))
  }

  return (response.rows ?? []).map((row) => {
    const sessions = parseInt(row.metricValues?.[0]?.value ?? '0')
    const bookingStarts = bookingMap.get(row.dimensionValues?.[0]?.value ?? '') ?? 0
    return {
      page: row.dimensionValues?.[0]?.value ?? '',
      sessions,
      bookingStarts,
      conversionRate: sessions > 0 ? Math.round((bookingStarts / sessions) * 1000) / 10 : 0,
    }
  })
}

export interface GA4UTMRow {
  source: string
  medium: string
  campaign: string
  sessions: number
  bookingStarts: number
  conversionRate: number
}

export async function fetchGA4UTMs(
  propertyId: string,
  encryptedServiceAccountJson: string,
  bookingEventName: string,
  days: number | DateRange = 30
): Promise<GA4UTMRow[]> {
  const client = getClient(encryptedServiceAccountJson)
  const { start, end } = toRange(days)
  const fmt = (d: string) => d

  const [sessions, bookings] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'sessionCampaignName' },
      ],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'sessionCampaignName' },
      ],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: bookingEventName, matchType: 'EXACT' },
        },
      },
      limit: 50,
    }),
  ])

  // Merge sessions + bookings by source/medium/campaign key
  const bookingMap = new Map<string, number>()
  for (const row of bookings[0].rows ?? []) {
    const key = [
      row.dimensionValues?.[0]?.value,
      row.dimensionValues?.[1]?.value,
      row.dimensionValues?.[2]?.value,
    ].join('|')
    bookingMap.set(key, parseInt(row.metricValues?.[0]?.value ?? '0'))
  }

  return (sessions[0].rows ?? []).map((row) => {
    const source = row.dimensionValues?.[0]?.value ?? ''
    const medium = row.dimensionValues?.[1]?.value ?? ''
    const campaign = row.dimensionValues?.[2]?.value ?? ''
    const s = parseInt(row.metricValues?.[0]?.value ?? '0')
    const b = bookingMap.get(`${source}|${medium}|${campaign}`) ?? 0
    return {
      source,
      medium,
      campaign,
      sessions: s,
      bookingStarts: b,
      conversionRate: s > 0 ? Math.round((b / s) * 1000) / 10 : 0,
    }
  })
}

export interface GA4VisitorMetrics {
  totalUsers: number
  newUsers: number
  sessions: number
  bounceRate: number
  avgSessionDuration: number
  deviceBreakdown: { device: string; sessions: number }[]
  channelBreakdown: { channel: string; users: number }[]
}

export async function fetchGA4Visitors(
  propertyId: string,
  encryptedServiceAccountJson: string,
  days: number | DateRange = 30
): Promise<GA4VisitorMetrics> {
  const client = getClient(encryptedServiceAccountJson)
  const { start, end } = toRange(days)
  const fmt = (d: string) => d

  const [summary, devices, channels] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      limit: 8,
    }),
  ])

  const s = summary[0].rows?.[0]
  return {
    totalUsers: parseInt(s?.metricValues?.[0]?.value ?? '0'),
    newUsers: parseInt(s?.metricValues?.[1]?.value ?? '0'),
    sessions: parseInt(s?.metricValues?.[2]?.value ?? '0'),
    bounceRate: parseFloat(s?.metricValues?.[3]?.value ?? '0'),
    avgSessionDuration: parseFloat(s?.metricValues?.[4]?.value ?? '0'),
    deviceBreakdown: (devices[0].rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? '',
      sessions: parseInt(r.metricValues?.[0]?.value ?? '0'),
    })),
    channelBreakdown: (channels[0].rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? '',
      users: parseInt(r.metricValues?.[0]?.value ?? '0'),
    })),
  }
}

export interface DailyHealthRow {
  date: string // YYYYMMDD
  sessions: number
  keyActions: number
}

/** Daily sessions and key-action counts for the last `days` days (today excluded), with empty days as 0. */
export async function fetchGA4DailyHealth(
  propertyId: string,
  encryptedServiceAccountJson: string,
  keyEventName: string,
  days = 21
): Promise<DailyHealthRow[]> {
  const client = getClient(encryptedServiceAccountJson)
  const end = new Date()
  end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const range = [{ startDate: fmt(start), endDate: fmt(end) }]

  const [[sessions], [events]] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: range,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: range,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: keyEventName, matchType: 'EXACT' } } },
    }),
  ])

  const toMap = (rows: any[] | null | undefined) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.dimensionValues?.[0]?.value ?? '', parseInt(r.metricValues?.[0]?.value ?? '0'))
    return m
  }
  const s = toMap(sessions.rows)
  const e = toMap(events.rows)
  const out: DailyHealthRow[] = []
  const day = new Date(start)
  while (fmt(day) <= fmt(end)) {
    const key = fmt(day).replace(/-/g, '')
    out.push({ date: key, sessions: s.get(key) ?? 0, keyActions: e.get(key) ?? 0 })
    day.setDate(day.getDate() + 1)
  }
  return out
}
