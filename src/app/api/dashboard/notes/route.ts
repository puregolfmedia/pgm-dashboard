import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveClientAccess } from '@/lib/access'
import { rangeFromParams } from '@/lib/dateRange'

// "What we did" notes for the period, shown as markers on charts.
export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access
  const range = rangeFromParams(new URL(request.url).searchParams)
  const notes = await prisma.note.findMany({
    where: { clientId: access.clientId, date: { gte: new Date(`${range.start}T00:00:00Z`), lte: new Date(`${range.end}T23:59:59.999Z`) } },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json({ data: notes, lastUpdated: new Date().toISOString(), error: null })
}
