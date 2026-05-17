import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchGA4Overview, fetchGA4DailyBookings, fetchGA4TrafficSources, fetchGA4LandingPages } from '@/lib/ga4'
import { fetchMetaOverview } from '@/lib/meta'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import { pctChange, formatNumber, formatCurrency, formatPercent } from '@/lib/utils'
import type { ApiResponse } from '@/types/api'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ data: null, lastUpdated: null, error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const clientId = user.clientId

  // ADMIN can pass ?clientId= to view any client
  const url = new URL(request.url)
  const requestedClientId = url.searchParams.get('clientId') ?? clientId
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30'), 7), 90)

  if (user.role !== 'ADMIN' && requestedClientId !== clientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Forbidden' }, { status: 403 })
  }

  if (!requestedClientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'No client associated' }, { status: 400 })
  }

  const cacheKey = makeCacheKey(requestedClientId, 'overview', `${days}d`)
  const cached = cacheGet<any>(cacheKey)
  if (cached) {
    return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })
  }

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })
  if (!config) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Data source not configured' }, { status: 503 })
  }

  try {
    const bookingEventName = config.ga4BookingEventName ?? 'generate_lead'

    const [ga4, meta, dailyBookings, trafficSources, landingPages] = await Promise.allSettled([
      config.ga4PropertyId && config.ga4ServiceAccountJson
        ? fetchGA4Overview(config.ga4PropertyId, config.ga4ServiceAccountJson, bookingEventName, days)
        : Promise.resolve(null),
      config.metaAdAccountId && config.metaAccessToken
        ? fetchMetaOverview(config.metaAdAccountId, config.metaAccessToken, days)
        : Promise.resolve(null),
      config.ga4PropertyId && config.ga4ServiceAccountJson
        ? fetchGA4DailyBookings(config.ga4PropertyId, config.ga4ServiceAccountJson, bookingEventName, days)
        : Promise.resolve([]),
      config.ga4PropertyId && config.ga4ServiceAccountJson
        ? fetchGA4TrafficSources(config.ga4PropertyId, config.ga4ServiceAccountJson, days)
        : Promise.resolve([]),
      config.ga4PropertyId && config.ga4ServiceAccountJson
        ? fetchGA4LandingPages(config.ga4PropertyId, config.ga4ServiceAccountJson, bookingEventName, days)
        : Promise.resolve([]),
    ])

    const ga4Data = ga4.status === 'fulfilled' ? ga4.value : null
    const metaData = meta.status === 'fulfilled' ? meta.value : null
    const daily = dailyBookings.status === 'fulfilled' ? dailyBookings.value : []
    const traffic = trafficSources.status === 'fulfilled' ? trafficSources.value : []
    const pages = landingPages.status === 'fulfilled' ? landingPages.value : []

    const costPerBooking = metaData && ga4Data && ga4Data.current.bookingStarts > 0
      ? metaData.current.spend / ga4Data.current.bookingStarts
      : null
    const prevCostPerBooking = metaData && ga4Data && ga4Data.previous.bookingStarts > 0
      ? metaData.previous.spend / ga4Data.previous.bookingStarts
      : null

    const data = {
      metrics: {
        sessions: {
          value: formatNumber(ga4Data?.current.sessions ?? 0),
          change: pctChange(ga4Data?.current.sessions ?? 0, ga4Data?.previous.sessions ?? 0),
          changePeriod: 'vs last 30 days',
        },
        bookingStarts: {
          value: formatNumber(ga4Data?.current.bookingStarts ?? 0),
          change: pctChange(ga4Data?.current.bookingStarts ?? 0, ga4Data?.previous.bookingStarts ?? 0),
          changePeriod: 'vs last 30 days',
        },
        costPerBooking: {
          value: costPerBooking !== null ? formatCurrency(costPerBooking) : '—',
          change: costPerBooking !== null && prevCostPerBooking !== null
            ? pctChange(costPerBooking, prevCostPerBooking)
            : 0,
          changePeriod: 'vs last 30 days',
        },
        ctr: {
          value: metaData ? formatPercent(metaData.current.ctr) : '—',
          change: pctChange(metaData?.current.ctr ?? 0, metaData?.previous.ctr ?? 0),
          changePeriod: 'vs last 30 days',
        },
        adSpend: {
          value: metaData ? formatCurrency(metaData.current.spend) : '—',
          change: pctChange(metaData?.current.spend ?? 0, metaData?.previous.spend ?? 0),
          changePeriod: 'vs last 30 days',
        },
        roas: {
          value: metaData?.current.roas ? `${metaData.current.roas.toFixed(1)}x` : '—',
          change: pctChange(metaData?.current.roas ?? 0, metaData?.previous.roas ?? 0),
          changePeriod: 'vs last 30 days',
        },
      },
      dailyBookings: daily,
      trafficSources: traffic,
      landingPages: pages,
    }

    const result = cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error('[overview]', err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch data' }, { status: 503 })
  }
}
