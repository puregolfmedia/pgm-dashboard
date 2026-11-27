import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

// A club's logins, one per person, so changes in the enquiry history carry a
// name and access can be removed for one person without affecting the rest.

export async function GET(_r: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const users = await prisma.user.findMany({
    where: { clientId: params.id, role: 'CLIENT' },
    select: { id: true, username: true, displayName: true, lastLoginAt: true, passwordResetRequired: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ data: users, error: null })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => ({}))
  const username = typeof b.username === 'string' ? b.username.trim().toLowerCase() : ''
  const displayName = typeof b.displayName === 'string' ? b.displayName.trim().slice(0, 80) : ''
  const password = typeof b.password === 'string' ? b.password : ''
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return NextResponse.json({ data: null, error: 'Usernames are 3–40 letters, numbers, dots, dashes or underscores' }, { status: 400 })
  }
  if (!displayName) return NextResponse.json({ data: null, error: 'Add the person’s name' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ data: null, error: 'Use a password of at least 8 characters' }, { status: 400 })
  if (!(await prisma.client.findUnique({ where: { id: params.id }, select: { id: true } }))) {
    return NextResponse.json({ data: null, error: 'Club not found' }, { status: 404 })
  }
  if (await prisma.user.findUnique({ where: { username } })) {
    return NextResponse.json({ data: null, error: 'That username is already taken' }, { status: 409 })
  }
  const user = await prisma.user.create({
    data: {
      username, displayName, role: 'CLIENT', clientId: params.id,
      passwordHash: await bcrypt.hash(password, 12),
      passwordResetRequired: b.mustChange !== false,
    },
    select: { id: true, username: true },
  })
  return NextResponse.json({ data: user, error: null })
}
