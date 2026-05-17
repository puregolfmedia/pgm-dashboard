import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchGA4LandingPages } from '@/lib/ga4'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import type { ApiResponse } from '@/types/api'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ data: null, lastUpdated: null, error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const clientId = user.clientId
  const url = new URL(request.url)
  const requestedClientId = url.searchParams.get('clientId') ?? clientId

  if (user.role !== 'ADMIN' && requestedClientId !== clientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Forbidden' }, { status: 403 })
  }

  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30'), 7), 90)
  const cacheKey = makeCacheKey(requestedClientId, 'pages', `${days}d`)
  const cached = cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })
  if (!config?.ga4PropertyId || !config?.ga4ServiceAccountJson) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'GA4 not configured' }, { status: 503 })
  }

  try {
    const pages = await fetchGA4LandingPages(
      config.ga4PropertyId,
      config.ga4ServiceAccountJson,
      config.ga4BookingEventName ?? 'generate_lead',
      days
    )
    const result = cacheSet(cacheKey, pages)
    return NextResponse.json({ data: pages, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof pages>)
  } catch (err) {
    console.error('[pages]', err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch GA4 data' }, { status: 503 })
  }
}
