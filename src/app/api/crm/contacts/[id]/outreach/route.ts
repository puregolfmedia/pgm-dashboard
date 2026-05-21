import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OutreachStatus, OutreachType } from '@/generated/prisma/client'
import { calcPriorityScore } from '@/lib/crm/priority'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { type, notes, outreachStatus } = await request.json()

  if (!type || !Object.values(OutreachType).includes(type)) {
    return NextResponse.json({ data: null, error: 'Invalid outreach type' }, { status: 400 })
  }

  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  const now = new Date()
  const newStatus: OutreachStatus = outreachStatus ?? OutreachStatus.MESSAGED

  const [log] = await prisma.$transaction([
    prisma.outreachLog.create({ data: { contactId: id, type, notes } }),
    prisma.contact.update({
      where: { id },
      data: {
        outreachStatus: newStatus,
        lastContactedAt: now,
        priorityScore: calcPriorityScore({
          titleTier: contact.titleTier,
          industrySegment: contact.industrySegment,
          outreachStatus: newStatus,
          lastContactedAt: now,
        }),
      },
    }),
  ])

  return NextResponse.json({ data: log, error: null }, { status: 201 })
}
