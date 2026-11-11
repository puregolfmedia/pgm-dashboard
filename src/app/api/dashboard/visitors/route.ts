import { NextResponse } from 'next/server'
import { rangeFromParams } from '@/lib/dateRange'
import { demoResponse } from '@/lib/demo'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchGA4Visitors } from '@/lib/ga4'
import { trackingDates, canCompare } from '@/lib/tracking'
import { areaFromParams, areaWords, areaEvents } from '@/lib/areas'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import type { ApiResponse } from '@/types/api'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ data: null, lastUpdated: null, error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const clientId = user.clientId
  const url = new URL(request.url)
  const requestedClientId = url.searchParams.get('clientId') ?? clientId
  const range = rangeFromParams(url.searchParams)
  const days = range.days
  const area = areaFromParams(url.searchParams)

  if (user.role !== 'ADMIN' && requestedClientId !== clientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Forbidden' }, { status: 403 })
  }

  if (!requestedClientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'No client associated' }, { status: 400 })
  }

  const demo = await demoResponse(requestedClientId, 'visitors', days, area)
  if (demo) return demo

  const cacheKey = makeCacheKey(requestedClientId, 'visitors-v6', `${range.key}:${area}`)
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })
  if (!config?.ga4PropertyId || !config?.ga4ServiceAccountJson) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'GA4 not configured' }, { status: 503 })
  }

  try {
    const tracking = { ...trackingDates(config), pages: areaWords(area, config) }
    const full = await fetchGA4Visitors(config.ga4PropertyId, config.ga4ServiceAccountJson, areaEvents(area, config), range, tracking)
    // No comparison when the earlier period starts before tracking did
    const data = canCompare(range, tracking).visits ? full : {
      ...full,
      previous: undefined,
      dailySessions: full.dailySessions.map((d) => ({ ...d, previous: 0 })),
    }
    const result = await cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error('[visitors]', err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch GA4 data' }, { status: 503 })
  }
}
