export interface MetricValue {
  value: string
  change: number
  changePeriod?: string
}

export interface OverviewMetrics {
  sessions: MetricValue
  bookingStarts: MetricValue
  costPerBooking: MetricValue
  ctr: MetricValue
  adSpend: MetricValue
  roas: MetricValue
}

export interface DailyBooking {
  date: string
  bookings: number
}

export interface TrafficSource {
  source: string
  sessions: number
}

export interface LandingPage {
  page: string
  sessions: number
  bookingStarts: number
  conversionRate: number
}
