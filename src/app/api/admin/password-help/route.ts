import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const requests = await prisma.passwordHelpRequest.findMany({ where: { handledAt: null }, orderBy: { createdAt: 'asc' } })
  const users = await prisma.user.findMany({
    where: { username: { in: requests.map((r) => r.username) } },
    select: { username: true, client: { select: { id: true, name: true } } },
  })
  const byName = new Map(users.map((u) => [u.username, u.client]))
  return NextResponse.json({ data: requests.map((r) => ({ ...r, client: byName.get(r.username) ?? null })), error: null })
}

export async function PATCH(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const { id } = await request.json().catch(() => ({}))
  if (typeof id !== 'string') return NextResponse.json({ data: null, error: 'Missing id' }, { status: 400 })
  await prisma.passwordHelpRequest.update({ where: { id }, data: { handledAt: new Date() } }).catch(() => null)
  return NextResponse.json({ data: { ok: true }, error: null })
}
