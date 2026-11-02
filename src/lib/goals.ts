import { prisma } from '@/lib/prisma'

export interface GoalProgress {
  id: string
  name: string
  metric: 'ENQUIRIES' | 'BOOKINGS' | 'REVENUE'
  category: string | null
  target: number
  current: number
  startDate: string
  deadline: string
  daysLeft: number
  /** Where the goal should be by today if progress were even across the period (0–1). */
  expectedShare: number
  status: 'done' | 'on-track' | 'behind' | 'ended'
}

const matchesCategory = (goalCategory: string | null, enquiryCategory: string | null) =>
  !goalCategory || (enquiryCategory ?? '').toLowerCase() === goalCategory.toLowerCase()

/** Goals for a club with progress worked out from its enquiries. */
export async function getGoalProgress(clientId: string): Promise<GoalProgress[]> {
  const goals = await prisma.goal.findMany({ where: { clientId }, orderBy: { deadline: 'asc' } })
  if (goals.length === 0) return []

  const earliest = goals.reduce((d, g) => (g.startDate < d ? g.startDate : d), goals[0].startDate)
  const enquiries = await prisma.enquiry.findMany({
    where: { clientId, receivedAt: { gte: earliest } },
    select: { receivedAt: true, category: true, status: true, bookedValue: true, bookedAt: true },
  })

  const now = new Date()
  return goals.map((g) => {
    const end = new Date(g.deadline)
    end.setHours(23, 59, 59, 999)
    const inGoal = enquiries.filter((e) =>
      matchesCategory(g.category, e.category) && e.receivedAt >= g.startDate && e.receivedAt <= end)
    const booked = inGoal.filter((e) => e.status === 'BOOKED')

    const current =
      g.metric === 'ENQUIRIES' ? inGoal.length
      : g.metric === 'BOOKINGS' ? booked.length
      : booked.reduce((sum, e) => sum + (e.bookedValue ?? 0), 0)

    const total = end.getTime() - g.startDate.getTime()
    const elapsed = Math.min(Math.max(now.getTime() - g.startDate.getTime(), 0), total)
    const expectedShare = total > 0 ? elapsed / total : 1
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000))

    const status: GoalProgress['status'] =
      current >= g.target ? 'done'
      : now > end ? 'ended'
      : current / g.target >= expectedShare * 0.9 ? 'on-track'
      : 'behind'

    return {
      id: g.id,
      name: g.name,
      metric: g.metric,
      category: g.category,
      target: g.target,
      current,
      startDate: g.startDate.toISOString(),
      deadline: g.deadline.toISOString(),
      daysLeft,
      expectedShare,
      status,
    }
  })
}
