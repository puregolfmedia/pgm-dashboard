import { LRUCache } from 'lru-cache'

interface CachedResult<T> {
  data: T
  fetchedAt: string
}

// TODO: swap for Redis when deploying to multiple instances
const cache = new LRUCache<string, CachedResult<unknown>>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
})

export function cacheGet<T>(key: string): CachedResult<T> | undefined {
  return cache.get(key) as CachedResult<T> | undefined
}

export function cacheSet<T>(key: string, data: T): CachedResult<T> {
  const result: CachedResult<T> = { data, fetchedAt: new Date().toISOString() }
  cache.set(key, result as CachedResult<unknown>)
  return result
}

export function cacheInvalidate(prefix: string) {
  const keys = Array.from(cache.keys())
  for (const key of keys) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

export function makeCacheKey(...parts: string[]): string {
  return parts.join(':')
}
