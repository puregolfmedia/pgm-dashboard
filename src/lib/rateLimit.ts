import { prisma } from '@/lib/prisma'

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
