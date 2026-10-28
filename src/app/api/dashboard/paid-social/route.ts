import { NextResponse } from 'next/server'
import { rangeFromParams } from '@/lib/dateRange'
import { demoResponse } from '@/lib/demo'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchMetaOverview, fetchMetaCampaigns } from '@/lib/meta'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import { formatCurrency, formatPercent, pctChange } from '@/lib/utils'
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

  const demo = await demoResponse(requestedClientId, 'paid-social', days)
  if (demo) return demo

  const cacheKey = makeCacheKey(requestedClientId, 'paid-social', range.key)
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })
  if (!config?.metaAdAccountId || !config?.metaAccessToken) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Meta not configured' }, { status: 503 })
  }

  try {
    const [overview, campaigns] = await Promise.all([
      fetchMetaOverview(config.metaAdAccountId, config.metaAccessToken, range),
      fetchMetaCampaigns(config.metaAdAccountId, config.metaAccessToken, range),
    ])

    const data = {
      metrics: {
        spend: { value: formatCurrency(overview.current.spend), change: pctChange(overview.current.spend, overview.previous.spend) },
        impressions: { value: new Intl.NumberFormat('en-GB').format(overview.current.impressions), change: pctChange(overview.current.impressions, overview.previous.impressions) },
        clicks: { value: new Intl.NumberFormat('en-GB').format(overview.current.clicks), change: pctChange(overview.current.clicks, overview.previous.clicks) },
        ctr: { value: formatPercent(overview.current.ctr), change: pctChange(overview.current.ctr, overview.previous.ctr) },
        cpm: { value: formatCurrency(overview.current.cpm), change: pctChange(overview.current.cpm, overview.previous.cpm) },
        cpc: { value: formatCurrency(overview.current.cpc), change: pctChange(overview.current.cpc, overview.previous.cpc) },
        roas: { value: overview.current.roas ? `${overview.current.roas.toFixed(1)}x` : '—', change: pctChange(overview.current.roas ?? 0, overview.previous.roas ?? 0) },
      },
      campaigns,
    }

    const result = await cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error('[paid-social]', err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch Meta data' }, { status: 503 })
  }
}
