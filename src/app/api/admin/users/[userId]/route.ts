import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

// Change one club login: its name or password. Admin logins can't be changed here.

async function clubUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  return user?.role === 'CLIENT' ? user : null
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  if (!(await clubUser(params.userId))) return NextResponse.json({ data: null, error: 'Login not found' }, { status: 404 })
  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof b.displayName === 'string') {
    if (!b.displayName.trim()) return NextResponse.json({ data: null, error: 'Add the person’s name' }, { status: 400 })
    data.displayName = b.displayName.trim().slice(0, 80)
  }
  if (b.password !== undefined) {
    if (typeof b.password !== 'string' || b.password.length < 8) {
      return NextResponse.json({ data: null, error: 'Use a password of at least 8 characters' }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(b.password, 12)
    data.passwordResetRequired = b.mustChange === true
  }
  await prisma.user.update({ where: { id: params.userId }, data })
  return NextResponse.json({ data: { ok: true }, error: null })
}

export async function DELETE(_r: Request, { params }: { params: { userId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  if (!(await clubUser(params.userId))) return NextResponse.json({ data: null, error: 'Login not found' }, { status: 404 })
  // Their past changes keep their name in the enquiry history
  await prisma.user.delete({ where: { id: params.userId } })
  return NextResponse.json({ data: { ok: true }, error: null })
}
