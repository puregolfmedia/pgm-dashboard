import { NextResponse } from 'next/server'
import { rangeFromParams } from '@/lib/dateRange'
import { demoResponse } from '@/lib/demo'
import { resolveClientAccess } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { fetchGA4Overview, fetchGA4DailyBookings, fetchGA4EventsByChannel } from '@/lib/ga4'
import { trackingDates, canCompare } from '@/lib/tracking'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import { pctChange } from '@/lib/utils'

// Membership: progress towards the club's membership value target (entered
// monthly by Pure Golf Media), plus membership enquiries from the website.

export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access
  const range = rangeFromParams(new URL(request.url).searchParams)

  const demo = await demoResponse(access.clientId, 'membership', range.days)
  if (demo) return demo

  const [client, values, config] = await Promise.all([
    prisma.client.findUnique({ where: { id: access.clientId }, select: { membershipBaseline: true, membershipTarget: true, membershipTargetDate: true } }),
    prisma.membershipValue.findMany({ where: { clientId: access.clientId }, orderBy: { date: 'asc' }, take: 60 }),
    prisma.dataSourceConfig.findUnique({ where: { clientId: access.clientId } }),
  ])

  const goal = {
    baseline: client?.membershipBaseline ?? null,
    target: client?.membershipTarget ?? null,
    targetDate: client?.membershipTargetDate?.toISOString() ?? null,
  }
  const history = values.map((v) => ({ date: v.date.toISOString(), value: v.value, members: v.members }))

  // Website membership enquiries (GA4), cached like the other Google figures
  let enquiries: any = null
  if (config?.ga4PropertyId && config.ga4ServiceAccountJson) {
    const cacheKey = makeCacheKey(access.clientId, 'membership-v2', range.key)
    const cached = await cacheGet<any>(cacheKey)
    if (cached) enquiries = cached.data
    else {
      try {
        const event = config.ga4MembershipEventName || 'membership_enquiry'
        const tracking = trackingDates(config)
        const [overview, daily, channels] = await Promise.all([
          fetchGA4Overview(config.ga4PropertyId, config.ga4ServiceAccountJson, event, range, tracking),
          fetchGA4DailyBookings(config.ga4PropertyId, config.ga4ServiceAccountJson, event, range, tracking),
          fetchGA4EventsByChannel(config.ga4PropertyId, config.ga4ServiceAccountJson, event, range, tracking),
        ])
        enquiries = {
          label: config.membershipGoalLabel || 'Membership enquiries',
          total: overview.current.bookingStarts,
          change: canCompare(range, tracking).bookings ? pctChange(overview.current.bookingStarts, overview.previous.bookingStarts) : 0,
          daily,
          channels,
        }
        await cacheSet(cacheKey, enquiries)
      } catch (err) {
        console.error('[membership:ga4]', err)
      }
    }
  }

  return NextResponse.json({ data: { goal, history, enquiries }, lastUpdated: new Date().toISOString(), error: null })
}
