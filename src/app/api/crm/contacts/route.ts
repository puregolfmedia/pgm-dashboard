import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OutreachStatus, TitleTier } from '@/generated/prisma/client'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

export async function GET(request: Request) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier') as TitleTier | null
  const status = searchParams.get('status') as OutreachStatus | null
  const segment = searchParams.get('segment')
  const search = searchParams.get('search')
  const priorityOnly = searchParams.get('priorityOnly') === 'true'

  const where: any = {}
  if (tier) where.titleTier = tier
  if (status) where.outreachStatus = status
  if (segment) where.industrySegment = segment
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (priorityOnly) {
    where.titleTier = { in: [TitleTier.TIER_1, TitleTier.TIER_2] }
    where.outreachStatus = { notIn: [OutreachStatus.NOT_INTERESTED, OutreachStatus.MEETING_BOOKED] }
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { priorityScore: 'desc' },
    take: priorityOnly ? 20 : undefined,
  })

  return NextResponse.json({ data: contacts, error: null })
}
