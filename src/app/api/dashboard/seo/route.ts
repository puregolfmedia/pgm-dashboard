import { NextResponse } from 'next/server'
import { rangeFromParams } from '@/lib/dateRange'
import { demoResponse } from '@/lib/demo'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSearchConsole } from '@/lib/searchConsole'
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

  if (user.role !== 'ADMIN' && requestedClientId !== clientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Forbidden' }, { status: 403 })
  }

  if (!requestedClientId) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'No client associated' }, { status: 400 })
  }

  const demo = await demoResponse(requestedClientId, 'seo', days)
  if (demo) return demo

  const cacheKey = makeCacheKey(requestedClientId, 'seo', range.key)
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })
  if (!config?.searchConsoleSiteUrl || !config?.ga4ServiceAccountJson) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Search Console not configured' }, { status: 503 })
  }

  try {
    const data = await fetchSearchConsole(config.searchConsoleSiteUrl, config.ga4ServiceAccountJson, range)
    const result = await cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err: any) {
    console.error('[seo]', err?.response?.data ?? err)
    // Admins get Google's reason (e.g. missing permission) to help with setup
    const reason = err?.response?.data?.error?.message
    const error = user.role === 'ADMIN' && reason
      ? `Failed to fetch Search Console data: ${reason}`
      : 'Failed to fetch Search Console data'
    return NextResponse.json({ data: null, lastUpdated: null, error }, { status: 503 })
  }
}
