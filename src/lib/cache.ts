import { LRUCache } from 'lru-cache'
import { prisma } from '@/lib/prisma'

// Two-level cache for data fetched from Google, Meta and Mailchimp:
//  1. memory on this server (instant, but each Vercel server has its own), then
//  2. the database (shared by every server, so a page loaded once is fast for
//     everyone until it expires).
// The database level is best-effort: if it fails, pages still work, just slower.

interface CachedResult<T> {
  data: T
  fetchedAt: string
}

const TTL_MS = 1000 * 60 * 10 // 10 minutes

const memory = new LRUCache<string, CachedResult<unknown>>({ max: 500, ttl: TTL_MS })

export async function cacheGet<T>(key: string): Promise<CachedResult<T> | undefined> {
  const hit = memory.get(key) as CachedResult<T> | undefined
  if (hit) return hit
  try {
    const row = await prisma.cacheEntry.findUnique({ where: { key } })
    if (!row || row.expiresAt < new Date()) return undefined
    const result = { data: row.value as T, fetchedAt: row.fetchedAt.toISOString() }
    memory.set(key, result as CachedResult<unknown>, { ttl: Math.max(row.expiresAt.getTime() - Date.now(), 1) })
    return result
  } catch (err) {
    console.error('[cache:get]', err)
    return undefined
  }
}

export async function cacheSet<T>(key: string, data: T): Promise<CachedResult<T>> {
  const fetchedAt = new Date()
  const result: CachedResult<T> = { data, fetchedAt: fetchedAt.toISOString() }
  memory.set(key, result as CachedResult<unknown>)
  const expiresAt = new Date(fetchedAt.getTime() + TTL_MS)
  try {
    const value = JSON.parse(JSON.stringify(data ?? null))
    await prisma.cacheEntry.upsert({
      where: { key },
      create: { key, value, fetchedAt, expiresAt },
      update: { value, fetchedAt, expiresAt },
    })
    // Occasionally tidy away expired entries so the table stays small
    if (Math.random() < 0.02) await prisma.cacheEntry.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  } catch (err) {
    console.error('[cache:set]', err)
  }
  return result
}

/** Forget everything cached for a club (call after its settings change). */
export async function cacheInvalidate(prefix: string) {
  for (const key of Array.from(memory.keys())) {
    if (key.startsWith(prefix)) memory.delete(key)
  }
  try {
    await prisma.cacheEntry.deleteMany({ where: { key: { startsWith: prefix } } })
  } catch (err) {
    console.error('[cache:invalidate]', err)
  }
}

export function makeCacheKey(...parts: string[]): string {
  return parts.join(':')
}
