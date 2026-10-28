import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveClientAccess } from '@/lib/access'

// "What we did" notes for the period, shown as markers on charts.
export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access
  const days = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('days') ?? '30'), 1), 400)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const notes = await prisma.note.findMany({
    where: { clientId: access.clientId, date: { gte: since } },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json({ data: notes, lastUpdated: new Date().toISOString(), error: null })
}
