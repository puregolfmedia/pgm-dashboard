import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { toView, logEvent, actorFromSession, parseType, STATUSES } from '@/lib/crm'
import { encryptPII, piiReady } from '@/lib/pii'

/** Load an enquiry only if the signed-in user may see its club. */
async function loadOwned(id: string) {
  const session = await auth()
  const user = session?.user as any
  if (!user) return { error: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 }) }
  if (!piiReady()) return { error: NextResponse.json({ data: null, error: 'The CRM keys are not set up yet' }, { status: 503 }) }
  const enquiry = await prisma.enquiry.findUnique({ where: { id }, include: { contact: true } })
  if (!enquiry || (user.role !== 'ADMIN' && enquiry.clientId !== user.clientId)) {
    return { error: NextResponse.json({ data: null, error: 'Not found' }, { status: 404 }) }
  }
  return { enquiry, user, isAdmin: user.role === 'ADMIN' }
}

/** One enquiry with its history. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const found = await loadOwned(params.id)
  if (found.error) return found.error
  const events = await prisma.enquiryEvent.findMany({ where: { enquiryId: params.id }, orderBy: { at: 'asc' } })
  return NextResponse.json({ data: { ...toView(found.enquiry), events }, error: null })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const found = await loadOwned(params.id)
  if (found.error) return found.error
  const e = found.enquiry!
  const actor = await actorFromSession(found.user)
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  const log: [string, string | null, string | null, string | null][] = [] // kind, from, to, detail

  if (body.status !== undefined && body.status !== e.status) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ data: null, error: 'Unknown stage' }, { status: 400 })
    }
    update.status = body.status
    update.stageChangedAt = new Date()
    if (body.status === 'BOOKED') update.bookedAt = new Date()
    else { update.bookedAt = null; update.bookedValue = null }
    if (body.status !== 'LOST') update.lostReason = null
    log.push(['stage', e.status, body.status, null])
  }
  if (body.type !== undefined) {
    const type = parseType(body.type)
    if (!type) return NextResponse.json({ data: null, error: 'Unknown enquiry type' }, { status: 400 })
    if (type !== e.type) { update.type = type; log.push(['type', e.type, type, null]) }
  }
  if (body.bookedValue !== undefined) {
    const v = body.bookedValue === '' || body.bookedValue === null ? null : Number(body.bookedValue)
    if (v !== null && (!Number.isFinite(v) || v < 0 || v > 1_000_000)) {
      return NextResponse.json({ data: null, error: 'Enter the value in pounds' }, { status: 400 })
    }
    update.bookedValue = v
    if (v !== e.bookedValue) log.push(['value', e.bookedValue?.toString() ?? null, v?.toString() ?? null, null])
  }
  for (const [key, max] of [['category', 100], ['lostReason', 300]] as const) {
    if (body[key] !== undefined) update[key] = typeof body[key] === 'string' && body[key].trim() ? body[key].trim().slice(0, max) : null
  }
  if (body.staffNotes !== undefined) {
    const notes = typeof body.staffNotes === 'string' && body.staffNotes.trim() ? body.staffNotes.trim().slice(0, 5000) : null
    update.staffNotesEnc = encryptPII(notes)
    log.push(['note', null, null, notes ? 'Notes updated' : 'Notes cleared']) // the notes themselves stay out of the history
  }

  await prisma.$transaction(async (tx) => {
    await tx.enquiry.update({ where: { id: e.id }, data: update })
    if (e.contactId) await tx.contact.update({ where: { id: e.contactId }, data: { lastActivityAt: new Date() } })
    for (const [kind, from, to, detail] of log) await logEvent(tx, { enquiryId: e.id, clientId: e.clientId }, actor, kind, from, to, detail)
  })
  const fresh = await prisma.enquiry.findUnique({ where: { id: e.id }, include: { contact: true } })
  return NextResponse.json({ data: toView(fresh), error: null })
}

/** Pure Golf Media only: delete an enquiry, and the person too if they have no other enquiries. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const found = await loadOwned(params.id)
  if (found.error) return found.error
  if (!found.isAdmin) return NextResponse.json({ data: null, error: 'Only Pure Golf Media can delete enquiries' }, { status: 403 })
  const e = found.enquiry!
  await prisma.$transaction(async (tx) => {
    await tx.enquiry.delete({ where: { id: e.id } })
    if (e.contactId && (await tx.enquiry.count({ where: { contactId: e.contactId } })) === 0) {
      await tx.contact.delete({ where: { id: e.contactId } })
    }
  })
  return NextResponse.json({ data: { ok: true }, error: null })
}

