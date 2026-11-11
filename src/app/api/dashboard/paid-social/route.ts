import { NextResponse } from 'next/server'
import { rangeFromParams } from '@/lib/dateRange'
import { demoData } from '@/lib/demo'
import { areaFromParams, areaWords, matchesArea, type Area } from '@/lib/areas'
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

  const area = areaFromParams(url.searchParams)
  const client = requestedClientId ? await prisma.client.findUnique({ where: { id: requestedClientId }, select: { isDemo: true } }) : null
  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId ?? '' } })
  if (client?.isDemo) {
    const data = scopeToArea(demoData('paid-social', days) as any, area, config)
    return NextResponse.json({ data, lastUpdated: new Date().toISOString(), error: null })
  }

  const cacheKey = makeCacheKey(requestedClientId, 'paid-social', range.key)
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: scopeToArea(cached.data, area, config), lastUpdated: cached.fetchedAt, error: null })

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
    return NextResponse.json({ data: scopeToArea(data, area, config), lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error('[paid-social]', err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch Meta data' }, { status: 503 })
  }
}

/**
 * Golf / clubhouse view: keep only campaigns whose name mentions that side
 * (e.g. "PGM | Golf – Winter membership") and add their figures up again.
 * Comparisons aren't available per campaign, so no % change is shown.
 */
function scopeToArea(data: any, area: Area, config: any) {
  const words = areaWords(area, config)
  if (!words) return data
  const campaigns = (data.campaigns ?? []).filter((c: any) => matchesArea(c.name ?? '', [...words, area]))
  const sum = (k: string) => campaigns.reduce((s: number, c: any) => s + (Number(c[k]) || 0), 0)
  const spend = sum('spend'), impressions = sum('impressions'), clicks = sum('clicks')
  const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
  return {
    metrics: {
      spend: { value: formatCurrency(spend), change: 0 },
      impressions: { value: nf(impressions), change: 0 },
      clicks: { value: nf(clicks), change: 0 },
      ctr: { value: impressions ? formatPercent((clicks / impressions) * 100) : '—', change: 0 },
      cpm: { value: impressions ? formatCurrency((spend / impressions) * 1000) : '—', change: 0 },
      cpc: { value: clicks ? formatCurrency(spend / clicks) : '—', change: 0 },
      roas: { value: '—', change: 0 },
    },
    campaigns,
    area,
  }
}
