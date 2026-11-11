// The Golf / Clubhouse switch. Each side of the club is recognised by words in
// page addresses (website and Google search) and in email names. A club can set
// its own words in admin; these defaults suit most golf club websites.

export type Area = 'all' | 'golf' | 'clubhouse'

export const AREAS: { value: Area; label: string }[] = [
  { value: 'all', label: 'Whole club' },
  { value: 'golf', label: 'Golf' },
  { value: 'clubhouse', label: 'Clubhouse' },
]

export const DEFAULT_WORDS: Record<Exclude<Area, 'all'>, string[]> = {
  golf: ['member', 'green-fee', 'greenfee', 'visitor', 'societ', 'course', 'tee-time', 'teetime', 'junior', 'lesson',
    'academy', 'competition', 'open-day', 'handicap', 'pro-shop', 'golf-day'],
  clubhouse: ['christmas', 'festive', 'function', 'wedding', 'dining', 'restaurant', 'menu', 'clubhouse', 'afternoon-tea',
    'party', 'parties', 'private-hire', 'venue', 'sunday-lunch', 'event', 'celebration', 'meeting'],
}

export function areaFromParams(params: URLSearchParams): Area {
  const a = params.get('area')
  return a === 'golf' || a === 'clubhouse' ? a : 'all'
}

/** Comma-separated words from admin, or the defaults. */
export function areaWords(area: Area, config?: { golfPageWords?: string | null; clubhousePageWords?: string | null } | null): string[] | null {
  if (area === 'all') return null
  const custom = area === 'golf' ? config?.golfPageWords : config?.clubhousePageWords
  const words = custom?.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)
  return words?.length ? words : DEFAULT_WORDS[area]
}

/** Whether a name (e.g. an email subject) belongs to this side of the club. */
export function matchesArea(text: string, words: string[] | null) {
  if (!words) return true
  const t = text.toLowerCase()
  // "green-fee" should also match "green fee" in a subject line
  return words.some((w) => t.includes(w) || t.includes(w.replace(/-/g, ' ')))
}

/**
 * Which GA4 events count as "clicks" for each side. Clubhouse uses the club's main
 * booking event; golf uses its own list (membership enquiries, tee-time clicks…);
 * the whole club counts both.
 */
export function areaEvents(area: Area, config: { ga4BookingEventName?: string | null; ga4GolfEventNames?: string | null; ga4MembershipEventName?: string | null }) {
  const clubhouse = config.ga4BookingEventName || 'generate_lead'
  const golf = config.ga4GolfEventNames || null
  if (area === 'clubhouse') return clubhouse
  if (area === 'golf') return golf ?? config.ga4MembershipEventName ?? 'membership_enquiry'
  return golf ? `${clubhouse}, ${golf}` : clubhouse
}

/** What the "clicks" figure is called for each side. */
export function areaLabel(area: Area, config: { bookingGoalLabel?: string | null; membershipGoalLabel?: string | null; ga4GolfEventNames?: string | null }) {
  if (area === 'clubhouse') return config.bookingGoalLabel || 'Clicks'
  if (area === 'golf') return config.membershipGoalLabel || 'Clicks'
  // Whole club: the club's own label only fits when golf clicks aren't added in
  return config.ga4GolfEventNames ? 'Clicks' : config.bookingGoalLabel || 'Clicks'
}
