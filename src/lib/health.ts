import { prisma } from '@/lib/prisma'
import { fetchGA4DailyHealth, type DailyHealthRow } from '@/lib/ga4'
import { fetchMailchimpMetrics } from '@/lib/mailchimp'
import { fetchMetaOverview } from '@/lib/meta'
import { cacheGet, cacheSet } from '@/lib/cache'

// Automatic checks that each club's tracking and connections still work, so a
// broken tag or expired key gets noticed by us rather than by the client.

export type HealthLevel = 'ok' | 'warning' | 'problem' | 'not-set-up' | 'demo'

export interface Issue { level: 'warning' | 'problem'; text: string }

export interface ClientHealth {
  clientId: string
  name: string
  level: HealthLevel
  issues: Issue[]
  checkedAt: string
  stats: {
    sessions30: number | null
    sessionsChange: number | null // % vs previous 30 days... approximated from the 21-day window halves
    keyLabel: string
    keyActions7: number | null
    enquiries30: number
    booked30: number
    bookedValue30: number
  }
}

const RECENT = 3   // days that must look normal
const BASELINE = 14 // days to compare against

/**
 * Compare the last few complete days with the two weeks before.
 * Flags a collapse in visits (tag probably broken) or a key action that has
 * stopped being recorded (trigger probably broken).
 */
export function assessTracking(rows: DailyHealthRow[], keyLabel: string): Issue[] {
  if (rows.length < RECENT + 7) return []
  const recent = rows.slice(-RECENT)
  const base = rows.slice(-(RECENT + BASELINE), -RECENT)
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1)
  const issues: Issue[] = []

  const baseSessions = avg(base.map((r) => r.sessions))
  const recentSessions = avg(recent.map((r) => r.sessions))
  if (baseSessions >= 20 && recentSessions === 0) {
    issues.push({ level: 'problem', text: `No website visits recorded for ${RECENT} days (usually about ${Math.round(baseSessions)} a day). The Google Analytics tag has probably been removed or broken.` })
  } else if (baseSessions >= 20 && recentSessions < baseSessions * 0.3) {
    const drop = Math.round((1 - recentSessions / baseSessions) * 100)
    issues.push({ level: 'problem', text: `Website visits are down ${drop}% over the last ${RECENT} days (about ${Math.round(recentSessions)} a day vs ${Math.round(baseSessions)}). Check the Google Analytics tag is still on every page.` })
  }

  const baseKey = avg(base.map((r) => r.keyActions))
  const recentKey = recent.reduce((s, r) => s + r.keyActions, 0)
  const lastSeenIdx = rows.map((r) => r.keyActions > 0).lastIndexOf(true)
  if (baseKey >= 1 && recentKey === 0) {
    issues.push({ level: 'warning', text: `No “${keyLabel}” recorded for ${RECENT} days (usually about ${Math.round(baseKey)} a day). Check the tracking trigger in Tag Manager still fires.` })
  } else if (baseKey >= 2 && recentKey / RECENT < baseKey * 0.25) {
    issues.push({ level: 'warning', text: `“${keyLabel}” has dropped sharply over the last ${RECENT} days (about ${(recentKey / RECENT).toFixed(1)} a day vs ${baseKey.toFixed(1)}). Worth checking the tracking still works.` })
  } else if (lastSeenIdx === -1 && avg(rows.map((r) => r.sessions)) >= 20) {
    issues.push({ level: 'warning', text: `No “${keyLabel}” recorded in the last ${rows.length} days despite regular visits. The event name may be wrong or the trigger may not be firing.` })
  }
  return issues
}

const reason = (err: any) =>
  (err?.response?.data?.error?.message ?? err?.response?.data?.detail ?? err?.details ?? err?.message ?? 'unknown error').toString().slice(0, 160)

export async function getClientHealth(clientId: string, { fresh = false } = {}): Promise<ClientHealth> {
  const cacheKey = `${clientId}:health`
  if (!fresh) {
    const cached = await cacheGet<ClientHealth>(cacheKey)
    if (cached) return cached.data
  }

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId }, include: { dataConfig: true } })
  const cfg = client.dataConfig
  const keyLabel = cfg?.bookingGoalLabel || 'Booking starts'
  const issues: Issue[] = []

  const since30 = new Date(); since30.setDate(since30.getDate() - 30)
  const since14 = new Date(); since14.setDate(since14.getDate() - 14)
  const [enq30, formRecent, formBefore] = await Promise.all([
    prisma.enquiry.findMany({ where: { clientId, receivedAt: { gte: since30 } }, select: { status: true, bookedValue: true } }),
    prisma.enquiry.count({ where: { clientId, source: 'form', receivedAt: { gte: since14 } } }),
    prisma.enquiry.count({ where: { clientId, source: 'form', receivedAt: { lt: since14, gte: since30 } } }),
  ])
  const booked = enq30.filter((e) => e.status === 'BOOKED')
  const stats: ClientHealth['stats'] = {
    sessions30: null, sessionsChange: null, keyLabel, keyActions7: null,
    enquiries30: enq30.length, booked30: booked.length, bookedValue30: booked.reduce((s, e) => s + (e.bookedValue ?? 0), 0),
  }

  if (client.isDemo) {
    return { clientId, name: client.name, level: 'demo', issues: [], checkedAt: new Date().toISOString(), stats }
  }

  const ga4Ready = !!(cfg?.ga4PropertyId && cfg?.ga4ServiceAccountJson)
  const checks: Promise<void>[] = []

  if (ga4Ready) {
    checks.push(fetchGA4DailyHealth(cfg!.ga4PropertyId!, cfg!.ga4ServiceAccountJson!, cfg!.ga4BookingEventName ?? 'generate_lead', 30)
      .then((rows) => {
        issues.push(...assessTracking(rows, keyLabel))
        const sum = (xs: DailyHealthRow[], k: 'sessions' | 'keyActions') => xs.reduce((s, r) => s + r[k], 0)
        stats.sessions30 = sum(rows, 'sessions')
        stats.keyActions7 = sum(rows.slice(-7), 'keyActions')
        const firstHalf = sum(rows.slice(0, 15), 'sessions'), secondHalf = sum(rows.slice(15), 'sessions')
        stats.sessionsChange = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : null
      })
      .catch((err) => { issues.push({ level: 'problem', text: `Google Analytics couldn’t be reached: ${reason(err)}` }) }))
  } else if (cfg?.ga4PropertyId) {
    issues.push({ level: 'warning', text: 'Google Analytics property saved but no service account key — no website data will load.' })
  }

  if (cfg?.mailchimpApiKey && cfg?.mailchimpListId) {
    checks.push(fetchMailchimpMetrics(cfg.mailchimpApiKey, cfg.mailchimpListId, 30).then(() => {})
      .catch((err) => { issues.push({ level: 'problem', text: `Mailchimp connection failed: ${reason(err)}` }) }))
  }
  if (cfg?.metaAdAccountId && cfg?.metaAccessToken) {
    checks.push(fetchMetaOverview(cfg.metaAdAccountId, cfg.metaAccessToken, 7).then(() => {})
      .catch((err) => { issues.push({ level: 'problem', text: `Meta Ads connection failed (the token may have expired): ${reason(err)}` }) }))
  }
  await Promise.all(checks)

  if (client.intakeToken && formBefore >= 2 && formRecent === 0) {
    issues.push({ level: 'warning', text: 'No website form enquiries for 14 days, after earlier ones came in. Check the form still sends to the dashboard.' })
  }

  const nothingSetUp = !cfg?.ga4PropertyId && !cfg?.mailchimpApiKey && !cfg?.metaAdAccountId && !client.intakeToken
  const level: HealthLevel = issues.some((i) => i.level === 'problem') ? 'problem'
    : issues.length > 0 ? 'warning'
    : nothingSetUp ? 'not-set-up'
    : 'ok'

  const health: ClientHealth = { clientId, name: client.name, level, issues, checkedAt: new Date().toISOString(), stats }
  await cacheSet(cacheKey, health)
  return health
}
