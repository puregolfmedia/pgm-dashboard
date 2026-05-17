import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchGA4Overview, fetchGA4DailyBookings, fetchGA4TrafficSources } from '@/lib/ga4'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import { pctChange, formatNumber } from '@/lib/utils'
import type { ApiResponse } from '@/types/api'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ data: null, lastUpdated: null, error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const clientId = user.clientId
  const url = new URL(request.url)
  const requestedClientId = url.searchParams.get('clientId') ?? clientId
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30'), 7), 90)

  if (user.role !== 'ADMIN' && requestedClientId !== clientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Forbidden' }, { status: 403 })
  }

  if (!requestedClientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'No client associated' }, { status: 400 })
  }

  const cacheKey = makeCacheKey(requestedClientId, 'membership', `${days}d`)
  const cached = cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })
  if (!config?.ga4PropertyId || !config?.ga4ServiceAccountJson) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'GA4 not configured' }, { status: 503 })
  }

  const membershipEvent = config.ga4MembershipEventName ?? 'membership_enquiry'

  try {
    const [overview, trend, sources] = await Promise.all([
      fetchGA4Overview(config.ga4PropertyId, config.ga4ServiceAccountJson, membershipEvent, days),
      fetchGA4DailyBookings(config.ga4PropertyId, config.ga4ServiceAccountJson, membershipEvent, days),
      fetchGA4TrafficSources(config.ga4PropertyId, config.ga4ServiceAccountJson, days),
    ])

    const data = {
      metrics: {
        enquiries: {
          value: formatNumber(overview.current.bookingStarts),
          change: pctChange(overview.current.bookingStarts, overview.previous.bookingStarts),
          changePeriod: `vs prior ${days} days`,
        },
        sessions: {
          value: formatNumber(overview.current.sessions),
          change: pctChange(overview.current.sessions, overview.previous.sessions),
          changePeriod: `vs prior ${days} days`,
        },
        conversionRate: {
          value: overview.current.sessions > 0
            ? `${((overview.current.bookingStarts / overview.current.sessions) * 100).toFixed(2)}%`
            : '—',
          change: 0,
          changePeriod: `last ${days} days`,
        },
      },
      trend,
      sources,
      eventName: membershipEvent,
    }

    const result = cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error('[membership]', err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch GA4 data' }, { status: 503 })
  }
}
