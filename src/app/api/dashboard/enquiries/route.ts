import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveClientAccess } from '@/lib/access'

// List a club's enquiries (with a summary) and add one by hand.

export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access

  const url = new URL(request.url)
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30'), 1), 366)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const enquiries = await prisma.enquiry.findMany({
    where: { clientId: access.clientId, receivedAt: { gte: since } },
    orderBy: { receivedAt: 'desc' },
    take: 500,
  })

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
