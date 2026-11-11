import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

// The club's membership value goal and its monthly figures (admin only)

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[£,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

export async function GET(_r: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const [client, values] = await Promise.all([
    prisma.client.findUnique({ where: { id: params.id }, select: { membershipBaseline: true, membershipTarget: true, membershipTargetDate: true } }),
    prisma.membershipValue.findMany({ where: { clientId: params.id }, orderBy: { date: 'desc' }, take: 60 }),
  ])
  return NextResponse.json({ data: { goal: client, values }, error: null })
}

/** Add a month's figure. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => ({}))
  const date = new Date(b.date)
  const value = num(b.value)
  const members = b.members === '' || b.members == null ? null : Math.round(num(b.members) ?? NaN)
  if (isNaN(date.getTime()) || value === null || value < 0) {
    return NextResponse.json({ data: null, error: 'Add a date and the total membership value' }, { status: 400 })
  }
  if (members !== null && (!Number.isFinite(members) || members < 0)) {
    return NextResponse.json({ data: null, error: 'Members must be a whole number' }, { status: 400 })
  }
  const entry = await prisma.membershipValue.create({ data: { clientId: params.id, date, value, members } })
  return NextResponse.json({ data: entry, error: null })
}

/** Set the starting value, target and target date. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => ({}))
  const baseline = b.baseline === '' ? null : num(b.baseline)
  const target = b.target === '' ? null : num(b.target)
  const targetDate = b.targetDate ? new Date(b.targetDate) : null
  if (targetDate && isNaN(targetDate.getTime())) return NextResponse.json({ data: null, error: 'Enter the target date as a date' }, { status: 400 })
  if (baseline !== null && target !== null && target <= baseline) {
    return NextResponse.json({ data: null, error: 'The target should be higher than the starting value' }, { status: 400 })
  }
  await prisma.client.update({ where: { id: params.id }, data: { membershipBaseline: baseline, membershipTarget: target, membershipTargetDate: targetDate } })
  return NextResponse.json({ data: { ok: true }, error: null })
}
