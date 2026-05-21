import { prisma } from '@/lib/prisma'
import { TitleTier, OutreachStatus } from '@/generated/prisma/client'
import CrmDashboard from '@/components/crm/CrmDashboard'

export const dynamic = 'force-dynamic'

export default async function CrmPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)

  const [priorityQueue, followUpQueue, allContacts, stats] = await Promise.all([
    // Priority queue — top Tier 1/2 not yet messaged or replied
    prisma.contact.findMany({
      where: {
        titleTier: { in: [TitleTier.TIER_1, TitleTier.TIER_2] },
        outreachStatus: { notIn: [OutreachStatus.NOT_INTERESTED, OutreachStatus.MEETING_BOOKED, OutreachStatus.REPLIED] },
      },
      orderBy: { priorityScore: 'desc' },
      take: 15,
    }),
    // Follow-up queue — messaged but no reply in 7+ days, or explicitly marked No Response
    prisma.contact.findMany({
      where: {
        OR: [
          {
            outreachStatus: OutreachStatus.MESSAGED,
            lastContactedAt: { lt: sevenDaysAgo },
          },
          {
            outreachStatus: OutreachStatus.NO_RESPONSE,
          },
        ],
      },
      orderBy: { lastContactedAt: 'asc' }, // most overdue first
    }),
    // All contacts
    prisma.contact.findMany({ orderBy: { priorityScore: 'desc' } }),
    // Status counts
    prisma.contact.groupBy({
      by: ['outreachStatus'],
      _count: true,
    }),
  ])

  const statusCounts = Object.fromEntries(stats.map((s) => [s.outreachStatus, s._count]))

  return (
    <CrmDashboard
      priorityQueue={priorityQueue}
      followUpQueue={followUpQueue}
      allContacts={allContacts}
      statusCounts={statusCounts}
    />
  )
}
