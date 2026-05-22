import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OutreachStatus, CountryRegion } from '@/generated/prisma/client'
import { calcPriorityScore } from '@/lib/crm/priority'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

export async function POST(request: Request) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { ids, outreachStatus, countryRegion, country } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ data: null, error: 'No contact IDs provided' }, { status: 400 })
  }

  const isStatusUpdate = !!outreachStatus
  const isLocationUpdate = !!countryRegion

  if (!isStatusUpdate && !isLocationUpdate) {
    return NextResponse.json({ data: null, error: 'Provide outreachStatus or countryRegion' }, { status: 400 })
  }
  if (isStatusUpdate && !Object.values(OutreachStatus).includes(outreachStatus)) {
    return NextResponse.json({ data: null, error: 'Invalid status' }, { status: 400 })
  }
  if (isLocationUpdate && !Object.values(CountryRegion).includes(countryRegion)) {
    return NextResponse.json({ data: null, error: 'Invalid country region' }, { status: 400 })
  }

  const now = new Date()
  const contacts = await prisma.contact.findMany({ where: { id: { in: ids } } })

  await prisma.$transaction(
    contacts.map((c) => {
      const newStatus = isStatusUpdate ? outreachStatus : c.outreachStatus
      const newRegion = isLocationUpdate ? countryRegion : c.countryRegion

      return prisma.contact.update({
        where: { id: c.id },
        data: {
          ...(isStatusUpdate && {
            outreachStatus: newStatus,
            lastContactedAt: newStatus === OutreachStatus.MESSAGED ? now : c.lastContactedAt,
          }),
          ...(isLocationUpdate && {
            countryRegion: newRegion,
            country: country ?? c.country,
          }),
          priorityScore: calcPriorityScore({
            titleTier: c.titleTier,
            industrySegment: c.industrySegment,
            outreachStatus: newStatus,
            countryRegion: newRegion,
            country: isLocationUpdate ? (country ?? c.country) : c.country,
            lastContactedAt: isStatusUpdate && newStatus === OutreachStatus.MESSAGED ? now : c.lastContactedAt,
          }),
        },
      })
    })
  )

  return NextResponse.json({ data: { updated: ids.length }, error: null })
}
