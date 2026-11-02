import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'
import { getClientHealth } from '@/lib/health'

// Health and headline numbers for every club (or one, with ?clientId=).
// Results are cached for a few minutes; ?fresh=1 re-checks now.
export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const url = new URL(request.url)
  const only = url.searchParams.get('clientId')
  const fresh = url.searchParams.get('fresh') === '1'

  const clients = await prisma.client.findMany({
    where: only ? { id: only } : undefined,
    select: { id: true, name: true, isDemo: true, users: { where: { role: 'CLIENT' }, select: { lastLoginAt: true } } },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(clients.map(async (c) => {
    const lastLoginAt = c.users.map((u) => u.lastLoginAt).filter(Boolean).sort().pop() ?? null
    try {
      return { ...(await getClientHealth(c.id, { fresh })), lastLoginAt }
    } catch (err) {
      console.error('[health]', c.id, err)
      return {
        clientId: c.id, name: c.name, level: 'problem', lastLoginAt, checkedAt: new Date().toISOString(),
        issues: [{ level: 'problem', text: 'Health check failed to run — see Vercel logs ([health]).' }],
        stats: null,
      }
    }
  }))

  // Clubs needing attention first
  const order = { problem: 0, warning: 1, ok: 2, 'not-set-up': 3, demo: 4 } as Record<string, number>
  data.sort((a, b) => (order[a.level] - order[b.level]) || a.name.localeCompare(b.name))
  return NextResponse.json({ data, error: null })
}
