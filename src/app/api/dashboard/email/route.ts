import { NextResponse } from 'next/server'
import { rangeFromParams } from '@/lib/dateRange'
import { demoResponse } from '@/lib/demo'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchEmailOctopusMetrics } from '@/lib/emailOctopus'
import { fetchMailchimpMetrics } from '@/lib/mailchimp'
import { areaFromParams, areaWords, matchesArea } from '@/lib/areas'
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

  const demo = await demoResponse(requestedClientId, 'email', days, areaFromParams(url.searchParams))
  if (demo) return demo

  const cacheKey = makeCacheKey(requestedClientId, 'email-v3', `${range.key}:${areaFromParams(url.searchParams)}`)
  const cached = await cacheGet<any>(cacheKey)
  if (cached) return NextResponse.json({ data: cached.data, lastUpdated: cached.fetchedAt, error: null })

  const config = await prisma.dataSourceConfig.findUnique({ where: { clientId: requestedClientId } })

  const provider: 'mailchimp' | 'emailOctopus' | null =
    config?.mailchimpApiKey && config?.mailchimpListId ? 'mailchimp'
    : config?.emailOctopusApiKey ? 'emailOctopus'
    : null

  if (!provider) {
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Email marketing not configured' }, { status: 503 })
  }

  try {
    const all: any = provider === 'mailchimp'
      ? await fetchMailchimpMetrics(config!.mailchimpApiKey!, config!.mailchimpListId!, range)
      : await fetchEmailOctopusMetrics(config!.emailOctopusApiKey!, range)
    // Golf / clubhouse view: only emails whose name mentions that side, with averages redone
    const words = areaWords(areaFromParams(url.searchParams), config)
    const campaigns = (all.campaigns ?? []).filter((c: any) => matchesArea(c.name ?? '', words))
    const avg = (f: (c: any) => number) => campaigns.length ? Math.round(campaigns.reduce((s: number, c: any) => s + f(c), 0) / campaigns.length * 10) / 10 : 0
    const data = words ? {
      ...all, campaigns,
      totalSent: campaigns.reduce((s: number, c: any) => s + (c.sent ?? 0), 0),
      avgOpenRate: avg((c) => c.openRate), avgClickRate: avg((c) => c.clickRate),
    } : all
    const result = await cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error(`[email:${provider}]`, err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch email marketing data' }, { status: 503 })
  }
}
