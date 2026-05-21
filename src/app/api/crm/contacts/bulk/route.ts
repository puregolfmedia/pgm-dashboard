import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OutreachStatus } from '@/generated/prisma/client'
import { calcPriorityScore } from '@/lib/crm/priority'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

export async function POST(request: Request) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const { ids, outreachStatus } = await request.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ data: null, error: 'No contact IDs provided' }, { status: 400 })
  }
  if (!outreachStatus || !Object.values(OutreachStatus).includes(outreachStatus)) {
    return NextResponse.json({ data: null, error: 'Invalid status' }, { status: 400 })
  }

  const now = new Date()
  const contacts = await prisma.contact.findMany({ where: { id: { in: ids } } })

  // Update each with a recalculated priority score
  await prisma.$transaction(
    contacts.map((c) =>
      prisma.contact.update({
        where: { id: c.id },
        data: {
          outreachStatus,
          lastContactedAt: outreachStatus === OutreachStatus.MESSAGED ? now : c.lastContactedAt,
          priorityScore: calcPriorityScore({
            titleTier: c.titleTier,
            industrySegment: c.industrySegment,
            outreachStatus,
            lastContactedAt: outreachStatus === OutreachStatus.MESSAGED ? now : c.lastContactedAt,
          }),
        },
      })
    )
  )

  return NextResponse.json({ data: { updated: ids.length }, error: null })
}
