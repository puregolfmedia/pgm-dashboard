import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { decrypt } from './crypto'
import { toRange, type DateRange } from './dateRange'
import type { DailyBooking, LandingPage, TrafficSource } from '@/types/dashboard'

/** Dates a club's figures are trusted from (YYYY-MM-DD). */
export interface TrackingDates {
  /** When the website's analytics started recording */
  websiteFrom?: string | null
  /** When the booking/enquiry event started being counted (e.g. after set-up tests) */
  bookingsFrom?: string | null
}

const later = (a: string, b?: string | null) => (b && b > a ? b : a)

/** A date window with its start moved up to `from`, or null if the whole window is before it. */
function clip(start: string, end: string, from?: string | null) {
  const s = later(start, from)
  return s <= end ? { startDate: s, endDate: end } : null
}

/** Which day the booking/enquiry event is counted from: the later of the two dates. */
export function bookingsFromDate(t?: TrackingDates) {
  if (!t) return null
  const a = t.websiteFrom ?? null, b = t.bookingsFrom ?? null
  return a && b ? later(a, b) : a ?? b
}

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
  days: number | DateRange = 30,
  tracking?: TrackingDates
): Promise<GA4OverviewResult> {
  const client = getClient(encryptedServiceAccountJson)

  const r = toRange(days)

  const from = bookingsFromDate(tracking)
  const countBookings = async (w: { startDate: string; endDate: string } | null) => {
    if (!w) return 0
    const [res] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [w],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: bookingEventName, matchType: 'EXACT' } } },
    })
    return parseFloat(res.rows?.[0]?.metricValues?.[0]?.value ?? '0')
  }
  const [bookingsNow, bookingsPrev] = await Promise.all([
    countBookings(clip(r.start, r.end, from)),
    countBookings(clip(r.prevStart, r.prevEnd, from)),
  ])

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

  return {
    current: {
      sessions: getMetric(sRows, 'current', 0),
      bounceRate: getMetric(sRows, 'current', 1),
      avgSessionDuration: getMetric(sRows, 'current', 2),
      bookingStarts: bookingsNow,
    },
    previous: {
      sessions: getMetric(sRows, 'previous', 0),
      bookingStarts: bookingsPrev,
    },
  }
}

export async function fetchGA4DailyBookings(
  propertyId: string,
  encryptedServiceAccountJson: string,
  bookingEventName: string,
  days: number | DateRange = 30,
  tracking?: TrackingDates
): Promise<DailyBooking[]> {
  const client = getClient(encryptedServiceAccountJson)
  const r = toRange(days)
  const window = clip(r.start, r.end, bookingsFromDate(tracking))
  if (!window) return []
  const { startDate: start, endDate: end } = window
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
  days: number | DateRange = 30,
  tracking?: TrackingDates
): Promise<LandingPage[]> {
  const client = getClient(encryptedServiceAccountJson)
  const { start, end } = toRange(days)
  const bookingWindow = clip(start, end, bookingsFromDate(tracking))
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
      limit: 50,
    }),
    !bookingWindow ? Promise.resolve([{ rows: [] as any[] }] as const) : client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [bookingWindow],
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

export interface VisitorTotals {
  totalUsers: number
  newUsers: number
  sessions: number
  avgSessionDuration: number
  pagesPerSession: number
  engagementRate: number
}

export interface GA4VisitorMetrics extends VisitorTotals {
  bounceRate: number
  previous: VisitorTotals
  deviceBreakdown: { device: string; sessions: number }[]
  channelBreakdown: { channel: string; sessions: number; users: number; enquiries: number }[]
  /** One row per day of the chosen dates; `previous` is the matching day of the comparison period */
  dailySessions: { date: string; sessions: number; previous: number }[]
}

export async function fetchGA4Visitors(
  propertyId: string,
  encryptedServiceAccountJson: string,
  bookingEventName: string,
  days: number | DateRange = 30,
  tracking?: TrackingDates
): Promise<GA4VisitorMetrics> {
  const client = getClient(encryptedServiceAccountJson)
  const r = toRange(days)
  const property = `properties/${propertyId}`
  const current = [{ startDate: r.start, endDate: r.end }]
  const both = [
    { startDate: r.start, endDate: r.end, name: 'current' },
    { startDate: r.prevStart, endDate: r.prevEnd, name: 'previous' },
  ]

  const bookingWindow = clip(r.start, r.end, bookingsFromDate(tracking))
  const [[summary], [devices], [channels], [channelBookings], [dailyNow], [dailyPrev]] = await Promise.all([
    client.runReport({
      property,
      dateRanges: both,
      metrics: [
        { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'sessions' }, { name: 'bounceRate' },
        { name: 'averageSessionDuration' }, { name: 'screenPageViewsPerSession' }, { name: 'engagementRate' },
      ],
    }),
    client.runReport({
      property,
      dateRanges: current,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    client.runReport({
      property,
      dateRanges: current,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
    !bookingWindow ? Promise.resolve([{ rows: [] as any[] }] as const) : client.runReport({
      property,
      dateRanges: [bookingWindow],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: bookingEventName, matchType: 'EXACT' } } },
      limit: 50,
    }),
    client.runReport({ property, dateRanges: current, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }] }),
    client.runReport({
      property,
      dateRanges: [{ startDate: r.prevStart, endDate: r.prevEnd }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
    }),
  ])

  // With two date ranges and no other dimension, GA4 labels each row with the range name
  const totals = (name: string) => {
    const row = summary.rows?.find((x: any) => x.dimensionValues?.[0]?.value === name)
    const v = (i: number) => parseFloat(row?.metricValues?.[i]?.value ?? '0')
    return {
      totalUsers: v(0), newUsers: v(1), sessions: v(2), bounceRate: v(3),
      avgSessionDuration: v(4), pagesPerSession: v(5), engagementRate: v(6),
    }
  }
  const now = totals('current')
  const { bounceRate: _ignored, ...prevTotals } = totals('previous')

  const toMap = (rows: any[] | null | undefined) => {
    const m = new Map<string, number>()
    for (const x of rows ?? []) m.set(x.dimensionValues?.[0]?.value ?? '', parseInt(x.metricValues?.[0]?.value ?? '0'))
    return m
  }
  const bookingsByChannel = toMap(channelBookings.rows)
  const nowByDay = toMap(dailyNow.rows)
  const prevByDay = toMap(dailyPrev.rows)

  // Every day of the period, lined up with the same position in the comparison period
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  // Skip days before the website's tracking started (nothing was recorded then)
  const skip = tracking?.websiteFrom && tracking.websiteFrom > r.start
    ? Math.round((Date.parse(tracking.websiteFrom) - Date.parse(r.start)) / 86_400_000) : 0
  const day = new Date(`${r.start}T12:00:00Z`)
  const prevDay = new Date(`${r.prevStart}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + skip)
  prevDay.setUTCDate(prevDay.getUTCDate() + skip)
  const last = r.end.replace(/-/g, '')
  const dailySessions: GA4VisitorMetrics['dailySessions'] = []
  while (ymd(day) <= last) {
    dailySessions.push({ date: ymd(day), sessions: nowByDay.get(ymd(day)) ?? 0, previous: prevByDay.get(ymd(prevDay)) ?? 0 })
    day.setUTCDate(day.getUTCDate() + 1)
    prevDay.setUTCDate(prevDay.getUTCDate() + 1)
  }

  return {
    ...now,
    previous: prevTotals,
    deviceBreakdown: (devices.rows ?? []).map((x) => ({
      device: x.dimensionValues?.[0]?.value ?? '',
      sessions: parseInt(x.metricValues?.[0]?.value ?? '0'),
    })),
    channelBreakdown: (channels.rows ?? []).map((x) => {
      const channel = x.dimensionValues?.[0]?.value ?? ''
      return {
        channel,
        sessions: parseInt(x.metricValues?.[0]?.value ?? '0'),
        users: parseInt(x.metricValues?.[1]?.value ?? '0'),
        enquiries: bookingsByChannel.get(channel) ?? 0,
      }
    }),
    dailySessions,
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
