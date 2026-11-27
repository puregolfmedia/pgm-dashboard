import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

// Failed sign-ins are counted in the database, so the limit holds however many
// servers Vercel runs: 5 failures in 15 minutes locks that username for 15 minutes.

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

const keyFor = (username: string) => `login:${username.trim().toLowerCase()}`

export async function checkLoginRateLimit(username: string): Promise<{ allowed: boolean }> {
  const row = await prisma.loginAttempt.findUnique({ where: { key: keyFor(username) } })
  return { allowed: !(row?.blockedUntil && row.blockedUntil > new Date()) }
}

export async function recordLoginFailure(username: string): Promise<void> {
  const key = keyFor(username)
  const now = new Date()
  const row = await prisma.loginAttempt.findUnique({ where: { key } })
  // Start counting again once the window or a block has passed
  const fresh = !row || now.getTime() - row.firstFailedAt.getTime() > WINDOW_MS || (row.blockedUntil && row.blockedUntil <= now)
  const failures = fresh ? 1 : row!.failures + 1
  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, failures: 1, firstFailedAt: now },
    update: {
      failures,
      ...(fresh && { firstFailedAt: now, blockedUntil: null }),
      ...(failures >= MAX_ATTEMPTS && { blockedUntil: new Date(now.getTime() + BLOCK_MS) }),
    },
  })
}

export async function clearLoginFailures(username: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: keyFor(username) } })
}

/**
 * A simple counter for public forms (same table): allows `max` requests per
 * `windowMs` for a key, e.g. one person's IP address on one club's forms.
 * The key should already be hashed so no IP address is stored.
 */
export async function allowRequest(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date()
  const row = await prisma.loginAttempt.findUnique({ where: { key } })
  const fresh = !row || now.getTime() - row.firstFailedAt.getTime() > windowMs
  if (!fresh && row!.failures >= max) return false
  // Now and then, clear out old counters so the table stays small
  if (Math.random() < 0.02) {
    await prisma.loginAttempt.deleteMany({ where: { key: { not: { startsWith: 'login:' } }, firstFailedAt: { lt: new Date(now.getTime() - 86_400_000) } } })
  }
  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, failures: 1, firstFailedAt: now },
    update: fresh ? { failures: 1, firstFailedAt: now, blockedUntil: null } : { failures: { increment: 1 } },
  })
  return true
}

/** A one-way hash of the caller's IP address for rate limiting, so the address itself is never kept. */
export function requesterKey(request: Request, scope: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return `${scope}:${createHash('sha256').update(`${process.env.AUTH_SECRET ?? ''}:${ip}`).digest('hex').slice(0, 32)}`
}
