import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcPriorityScore } from '@/lib/crm/priority'
import { classifyTitleTier, classifyIndustrySegment } from '@/lib/crm/classify'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      outreachLogs: { orderBy: { sentAt: 'desc' } },
    },
  })
  if (!contact) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: contact, error: null })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.contact.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  const titleTier = body.titleTier ?? existing.titleTier
  const industrySegment = body.industrySegment ?? existing.industrySegment
  const outreachStatus = body.outreachStatus ?? existing.outreachStatus
  const countryRegion = body.countryRegion ?? existing.countryRegion
  const country = body.country !== undefined ? body.country : existing.country
  const lastContactedAt = body.lastContactedAt ? new Date(body.lastContactedAt) : existing.lastContactedAt

  const priorityScore = calcPriorityScore({ titleTier, industrySegment, outreachStatus, countryRegion, country, lastContactedAt })

  const updated = await prisma.contact.update({
    where: { id },
    data: { ...body, priorityScore, updatedAt: new Date() },
  })

  return NextResponse.json({ data: updated, error: null })
}
