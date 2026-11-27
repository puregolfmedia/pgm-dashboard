import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveClientAccess } from '@/lib/access'
import { rangeFromParams } from '@/lib/dateRange'
import { createEnquiry, secureLegacyEnquiries, toView, parseType, actorFromSession, STATUSES, SOURCES, type Source } from '@/lib/crm'
import { piiReady } from '@/lib/pii'

// List a club's enquiries (with a summary) and add one by hand.
// Personal details are decrypted here, only for people allowed to see this club.

export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access
  if (!piiReady()) return NextResponse.json({ data: null, error: 'The CRM keys are not set up yet' }, { status: 503 })

  // Older plain-text enquiries are encrypted the first time the list is opened
  await secureLegacyEnquiries(access.clientId)

  const url = new URL(request.url)
  const range = rangeFromParams(url.searchParams)
  const between = (from: string, to: string) => ({ gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59.999Z`) })
  const status = url.searchParams.get('status')
  const type = parseType(url.searchParams.get('type'))
  const source = url.searchParams.get('source')
  const filters = {
    ...(status && STATUSES.includes(status as any) && { status: status as any }),
    ...(type && { type }),
    ...(source && SOURCES.includes(source as Source) && { source }),
  }

  const [rows, previous, categories] = await Promise.all([
    prisma.enquiry.findMany({
      // Enquiries are complete records, so today's are included (unlike the
      // analytics, which stop at yesterday) — they may need following up now
      where: { clientId: access.clientId, ...filters, receivedAt: between(range.start, range.custom ? range.end : new Date().toISOString().slice(0, 10)) },
      include: { contact: true },
      orderBy: { receivedAt: 'desc' },
      take: 1000,
    }),
    prisma.enquiry.findMany({
      where: { clientId: access.clientId, ...filters, receivedAt: between(range.prevStart, range.prevEnd) },
      select: { status: true, bookedValue: true },
    }),
    prisma.enquiry.findMany({
      where: { clientId: access.clientId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    }),
  ])
  const enquiries = rows.map(toView)
  const won = enquiries.filter((e) => e.status === 'BOOKED')
  const prevWon = previous.filter((e) => e.status === 'BOOKED')

  return NextResponse.json({
    data: {
      summary: {
        total: enquiries.length,
        booked: won.length,
        bookedValue: won.reduce((s, e) => s + (e.bookedValue ?? 0), 0),
        conversionRate: enquiries.length > 0 ? Math.round((won.length / enquiries.length) * 1000) / 10 : 0,
        open: enquiries.filter((e) => ['NEW', 'CONTACTED', 'TOUR_BOOKED'].includes(e.status)).length,
      },
      previous: {
        total: previous.length,
        booked: prevWon.length,
        bookedValue: prevWon.reduce((s, e) => s + (e.bookedValue ?? 0), 0),
      },
      range: { start: range.start, end: range.end, compareLabel: range.compareLabel },
      categories: categories.map((c) => c.category as string).sort(),
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
  if (!piiReady()) return NextResponse.json({ data: null, error: 'The CRM keys are not set up yet' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const name = str(body.name, 200), email = str(body.email, 320), phone = str(body.phone, 50)
  if (!name && !email && !phone) {
    return NextResponse.json({ data: null, error: 'Add at least a name, email or phone number' }, { status: 400 })
  }
  const source = SOURCES.includes(body.source) ? body.source as Source : 'manual'
  const session = await auth()
  const enquiry = await createEnquiry({
    clientId: access.clientId,
    name, email, phone,
    message: str(body.message, 5000),
    category: str(body.category, 100),
    eventDate: str(body.eventDate, 100),
    type: parseType(body.type),
    source,
    sourceDetail: str(body.sourceDetail, 200),
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
  }, await actorFromSession(session?.user as any))
  return NextResponse.json({ data: { id: enquiry.id }, error: null })
}
