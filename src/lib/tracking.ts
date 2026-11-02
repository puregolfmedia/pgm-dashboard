import type { TrackingDates } from './ga4'
import { bookingsFromDate } from './ga4'
import type { DateRange } from './dateRange'

const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null)

/** The club's tracking dates, as YYYY-MM-DD strings. */
export function trackingDates(config: { ga4TrackingStartDate?: Date | null; ga4BookingStartDate?: Date | null }): TrackingDates {
  return { websiteFrom: ymd(config.ga4TrackingStartDate), bookingsFrom: ymd(config.ga4BookingStartDate) }
}

/**
 * Whether the comparison period is fully covered by tracking. If it starts
 * before tracking did, "up 900%" would be misleading, so no change is shown.
 */
export function canCompare(range: DateRange, t: TrackingDates) {
  const bookings = bookingsFromDate(t)
  return {
    visits: !t.websiteFrom || range.prevStart >= t.websiteFrom,
    bookings: !bookings || range.prevStart >= bookings,
  }
}
