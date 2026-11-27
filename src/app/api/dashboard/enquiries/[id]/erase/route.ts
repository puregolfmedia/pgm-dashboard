import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { anonymiseContact, anonymiseEnquiry, actorFromSession } from '@/lib/crm'

/**
 * Pure Golf Media only: erase a person's details (e.g. they've asked to be
 * forgotten). Their name, email, phone, messages and notes go from every
 * enquiry they made at this club; the enquiries stay as anonymous records so
 * the club's figures don't change.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  const user = session?.user as any
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ data: null, error: 'Only Pure Golf Media can erase someone’s details' }, { status: 403 })

  const e = await prisma.enquiry.findUnique({ where: { id: params.id }, select: { id: true, clientId: true, contactId: true } })
  if (!e) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  const actor = await actorFromSession(user)
  const reason = 'Personal details erased on request'
  const count = await prisma.$transaction(async (tx) => {
    if (e.contactId) return anonymiseContact(tx, e.contactId, actor, reason)
    await anonymiseEnquiry(tx, e, actor, reason)
    return 1
  })
  return NextResponse.json({ data: { enquiries: count }, error: null })
}
