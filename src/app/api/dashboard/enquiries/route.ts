import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveClientAccess } from '@/lib/access'
import { rangeFromParams } from '@/lib/dateRange'

// List a club's enquiries (with a summary) and add one by hand.

export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access

  const range = rangeFromParams(new URL(request.url).searchParams)
  const between = (from: string, to: string) => ({ gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59.999Z`) })

  const [enquiries, previous] = await Promise.all([
    prisma.enquiry.findMany({
      where: { clientId: access.clientId, receivedAt: between(range.start, range.end) },
      orderBy: { receivedAt: 'desc' },
      take: 1000,
    }),
    prisma.enquiry.findMany({
      where: { clientId: access.clientId, receivedAt: between(range.prevStart, range.prevEnd) },
      select: { status: true, bookedValue: true },
    }),
  ])
  const prevBooked = previous.filter((e) => e.status === 'BOOKED')

  const booked = enquiries.filter((e) => e.status === 'BOOKED')
  const bookedValue = booked.reduce((s, e) => s + (e.bookedValue ?? 0), 0)
  const categories = Array.from(new Set(
    (await prisma.enquiry.findMany({
      where: { clientId: access.clientId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    })).map((e) => e.category as string),
  )).sort()

  return NextResponse.json({
    data: {
      summary: {
        total: enquiries.length,
        booked: booked.length,
        bookedValue,
        conversionRate: enquiries.length > 0 ? Math.round((booked.length / enquiries.length) * 1000) / 10 : 0,
        open: enquiries.filter((e) => e.status === 'NEW' || e.status === 'CONTACTED').length,
      },
      previous: {
        total: previous.length,
        booked: prevBooked.length,
        bookedValue: prevBooked.reduce((s, e) => s + (e.bookedValue ?? 0), 0),
      },
      range: { start: range.start, end: range.end, compareLabel: range.compareLabel },
      categories,
      enquiries,
    },
    lastUpdated: new Date().toISOString(),
    error: null,
  })
}

const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

export async function POST(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access

  const body = await request.json().catch(() => ({}))
  const data = {
    name: str(body.name, 200),
    email: str(body.email, 320),
    phone: str(body.phone, 50),
    category: str(body.category, 100),
    eventDate: str(body.eventDate, 100),
    message: str(body.message, 5000),
  }
  if (!data.name && !data.email && !data.phone) {
    return NextResponse.json({ data: null, error: 'Add at least a name, email or phone number' }, { status: 400 })
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      clientId: access.clientId,
      source: 'manual',
      ...data,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
    },
  })
  return NextResponse.json({ data: enquiry, error: null })
}
