import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public: someone on the login page has forgotten their password. We record
// the request for Pure Golf Media to handle (no email is sent yet). The reply
// is the same whether or not the username exists, so it can't be used to
// discover usernames.

const recent = new Map<string, number[]>() // ip -> request times
const LIMIT = 5
const WINDOW_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  const ok = NextResponse.json({ ok: true })
  if (times.length >= LIMIT) return ok
  recent.set(ip, [...times, now])

  const body = await request.json().catch(() => ({}))
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 100) : ''
  if (!username) return NextResponse.json({ ok: false, error: 'Enter your username' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (user) {
    const open = await prisma.passwordHelpRequest.findFirst({ where: { username, handledAt: null } })
    if (!open) await prisma.passwordHelpRequest.create({ data: { username } })
  }
  return ok
}
