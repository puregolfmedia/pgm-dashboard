import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

const METRICS = ['ENQUIRIES', 'BOOKINGS', 'REVENUE'] as const

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => ({}))
  const target = Number(b.target)
  const startDate = new Date(b.startDate)
  const deadline = new Date(b.deadline)
  if (!b.name?.trim() || !METRICS.includes(b.metric) || !(target > 0)
      || isNaN(startDate.getTime()) || isNaN(deadline.getTime()) || deadline < startDate) {
    return NextResponse.json({ data: null, error: 'Give the goal a name, what to count, a target above 0, and a start date before the deadline' }, { status: 400 })
  }
  const goal = await prisma.goal.create({
    data: {
      clientId: params.id,
      name: b.name.trim().slice(0, 120),
      metric: b.metric,
      category: b.category?.trim() ? b.category.trim().slice(0, 100) : null,
      target,
      startDate,
      deadline,
    },
  })
  return NextResponse.json({ data: goal, error: null })
}
