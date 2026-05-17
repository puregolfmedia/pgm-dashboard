interface Attempt {
  count: number
  blockedUntil: number | null
}

const store = new Map<string, Attempt>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000  // 15 minutes
const BLOCK_MS = 15 * 60 * 1000   // block for 15 minutes after max failures

export function checkLoginRateLimit(key: string): { allowed: boolean; retriesLeft: number } {
  const now = Date.now()
  const entry = store.get(key) ?? { count: 0, blockedUntil: null }

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retriesLeft: 0 }
  }

  if (entry.blockedUntil && now >= entry.blockedUntil) {
    store.delete(key)
    return { allowed: true, retriesLeft: MAX_ATTEMPTS }
  }

  return { allowed: true, retriesLeft: MAX_ATTEMPTS - entry.count }
}

export function recordLoginFailure(key: string): void {
  const entry = store.get(key) ?? { count: 0, blockedUntil: null }
  const count = entry.count + 1
  store.set(key, {
    count,
    blockedUntil: count >= MAX_ATTEMPTS ? Date.now() + BLOCK_MS : null,
  })
  // Auto-clean after window
  setTimeout(() => store.delete(key), WINDOW_MS)
}

export function clearLoginFailures(key: string): void {
  store.delete(key)
}
