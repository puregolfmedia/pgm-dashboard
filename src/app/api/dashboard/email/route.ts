import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchEmailOctopusMetrics } from '@/lib/emailOctopus'
import { fetchMailchimpMetrics } from '@/lib/mailchimp'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
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

  const cacheKey = makeCacheKey(requestedClientId, 'email', `${days}d`)
  const cached = cacheGet<any>(cacheKey)
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
    const data = provider === 'mailchimp'
      ? await fetchMailchimpMetrics(config!.mailchimpApiKey!, config!.mailchimpListId!, days)
      : await fetchEmailOctopusMetrics(config!.emailOctopusApiKey!, days)
    const result = cacheSet(cacheKey, data)
    return NextResponse.json({ data, lastUpdated: result.fetchedAt, error: null } satisfies ApiResponse<typeof data>)
  } catch (err) {
    console.error(`[email:${provider}]`, err)
    return NextResponse.json({ data: null, lastUpdated: null, error: 'Failed to fetch email marketing data' }, { status: 503 })
  }
}
