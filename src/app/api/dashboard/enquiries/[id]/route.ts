import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const STATUSES = ['NEW', 'CONTACTED', 'BOOKED', 'LOST'] as const

/** Load an enquiry only if the signed-in user may see its club. */
async function loadOwned(id: string) {
  const session = await auth()
  const user = session?.user as any
  if (!user) return { error: NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 }) }
  const enquiry = await prisma.enquiry.findUnique({ where: { id } })
  if (!enquiry || (user.role !== 'ADMIN' && enquiry.clientId !== user.clientId)) {
    return { error: NextResponse.json({ data: null, error: 'Not found' }, { status: 404 }) }
  }
  return { enquiry, isAdmin: user.role === 'ADMIN' }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const found = await loadOwned(params.id)
  if (found.error) return found.error

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ data: null, error: 'Unknown status' }, { status: 400 })
    }
    update.status = body.status
    if (body.status === 'BOOKED' && found.enquiry!.status !== 'BOOKED') update.bookedAt = new Date()
    if (body.status !== 'BOOKED') { update.bookedAt = null; update.bookedValue = null }
  }
  if (body.bookedValue !== undefined) {
    const v = body.bookedValue === '' || body.bookedValue === null ? null : Number(body.bookedValue)
    if (v !== null && (!Number.isFinite(v) || v < 0 || v > 1_000_000)) {
      return NextResponse.json({ data: null, error: 'Enter the booking value in pounds' }, { status: 400 })
    }
    update.bookedValue = v
  }
  for (const [key, max] of [['category', 100], ['staffNotes', 2000]] as const) {
    if (body[key] !== undefined) update[key] = typeof body[key] === 'string' && body[key].trim() ? body[key].trim().slice(0, max) : null
  }

  const enquiry = await prisma.enquiry.update({ where: { id: params.id }, data: update })
  return NextResponse.json({ data: enquiry, error: null })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const found = await loadOwned(params.id)
  if (found.error) return found.error
  if (!found.isAdmin) return NextResponse.json({ data: null, error: 'Only Pure Golf Media can delete enquiries' }, { status: 403 })
  await prisma.enquiry.delete({ where: { id: params.id } })
  return NextResponse.json({ data: { ok: true }, error: null })
}
