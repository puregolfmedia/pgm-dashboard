import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Sample data for a demo club, so prospects can be shown a realistic
// dashboard without connecting any of their accounts. Numbers are made up but
// stable (seeded), and shaped exactly like each tab's real data.

type Kind = 'overview' | 'visitors' | 'membership' | 'email' | 'paid-social' | 'pages' | 'utms' | 'seo'

/** Return sample data if this club is a demo club, otherwise null. */
export async function demoResponse(clientId: string | null | undefined, kind: Kind, days: number) {
  if (!clientId) return null
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { isDemo: true } })
  if (!client?.isDemo) return null
  return NextResponse.json({ data: demoData(kind, days), lastUpdated: new Date().toISOString(), error: null })
}

function rng(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n)
const metric = (value: string, change: number, days: number) => ({ value, change, changePeriod: `vs prior ${days} days` })

function daily(days: number, base: number, seed: number) {
  const r = rng(seed)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 1.4 : 1
    const trend = 0.8 + (i / days) * 0.5
    return { date: d.toISOString().slice(0, 10).replace(/-/g, ''), bookings: Math.round(base * weekend * trend * (0.6 + r() * 0.8)) }
  })
}

export function demoData(kind: Kind, days: number): unknown {
  const scale = days / 30
  switch (kind) {
    case 'overview': {
      const dailyBookings = daily(days, 3, 7)
      const bookings = dailyBookings.reduce((s, d) => s + d.bookings, 0)
      const spend = 420 * scale
      return {
        metrics: {
          sessions: metric(nf(4180 * scale), 18, days),
          bookingStarts: metric(nf(bookings), 24, days),
          costPerBooking: metric(gbp(spend / Math.max(bookings, 1)), -12, days),
          ctr: metric('2.4%', 9, days),
          adSpend: metric(gbp(spend), 5, days),
          roas: metric('6.8x', 21, days),
        },
        dailyBookings,
        trafficSources: [
          { source: 'Organic Search', sessions: Math.round(1650 * scale) },
          { source: 'Direct', sessions: Math.round(1120 * scale) },
          { source: 'Paid Social', sessions: Math.round(640 * scale) },
          { source: 'Organic Social', sessions: Math.round(380 * scale) },
          { source: 'Email', sessions: Math.round(250 * scale) },
          { source: 'Referral', sessions: Math.round(140 * scale) },
        ],
        landingPages: demoPages(scale),
        warnings: [],
        labels: { booking: 'Christmas enquiries' },
      }
    }
    case 'visitors':
      return {
        totalUsers: Math.round(3050 * scale), newUsers: Math.round(2210 * scale), sessions: Math.round(4180 * scale),
        bounceRate: 0.38, avgSessionDuration: 112,
        deviceBreakdown: [
          { device: 'mobile', sessions: Math.round(2840 * scale) },
          { device: 'desktop', sessions: Math.round(1180 * scale) },
          { device: 'tablet', sessions: Math.round(160 * scale) },
        ],
        channelBreakdown: [
          { channel: 'Organic Search', users: Math.round(1290 * scale) },
          { channel: 'Direct', users: Math.round(860 * scale) },
          { channel: 'Paid Social', users: Math.round(520 * scale) },
          { channel: 'Organic Social', users: Math.round(250 * scale) },
          { channel: 'Email', users: Math.round(130 * scale) },
        ],
      }
    case 'membership': {
      const trend = daily(days, 1, 11)
      const enquiries = trend.reduce((s, d) => s + d.bookings, 0)
      return {
        label: 'Membership enquiries',
        metrics: {
          enquiries: metric(nf(enquiries), 15, days),
          sessions: metric(nf(4180 * scale), 18, days),
          conversionRate: { value: `${((enquiries / (4180 * scale)) * 100).toFixed(2)}%`, change: 0, changePeriod: `last ${days} days` },
        },
        trend,
        sources: [
          { source: 'Organic Search', sessions: Math.round(1650 * scale) },
          { source: 'Direct', sessions: Math.round(1120 * scale) },
          { source: 'Paid Social', sessions: Math.round(640 * scale) },
        ],
        eventName: 'membership_enquiry',
      }
    }
    case 'email': {
      const campaigns = [
        { id: 'd1', name: 'Book your Christmas party at the club', daysAgo: 4, sent: 1840, open: 0.51, click: 0.062 },
        { id: 'd2', name: 'Sunday lunch is back — book a table', daysAgo: 18, sent: 1826, open: 0.47, click: 0.041 },
        { id: 'd3', name: 'Winter membership offer', daysAgo: 27, sent: 1810, open: 0.44, click: 0.033 },
      ].filter((c) => c.daysAgo <= days).map((c) => {
        const d = new Date(); d.setDate(d.getDate() - c.daysAgo)
        return {
          id: c.id, name: c.name, sentAt: d.toISOString(), sent: c.sent,
          opened: Math.round(c.sent * c.open), clicked: Math.round(c.sent * c.click),
          bounced: 14, unsubscribed: 4, openRate: c.open * 100, clickRate: Math.round(c.click * 1000) / 10,
        }
      })
      const avg = (f: (c: any) => number) => campaigns.length ? Math.round(campaigns.reduce((s, c) => s + f(c), 0) / campaigns.length * 10) / 10 : 0
      return {
        totalSent: campaigns.reduce((s, c) => s + c.sent, 0),
        avgOpenRate: avg((c) => c.openRate), avgClickRate: avg((c) => c.clickRate),
        avgBounceRate: avg((c) => (c.bounced / c.sent) * 100), avgUnsubscribeRate: avg((c) => (c.unsubscribed / c.sent) * 100),
        campaigns,
      }
    }
    case 'paid-social': {
      const spend = 420 * scale
      return {
        metrics: {
          spend: { value: gbp(spend), change: 5 },
          impressions: { value: nf(61200 * scale), change: 12 },
          clicks: { value: nf(1470 * scale), change: 16 },
          ctr: { value: '2.40%', change: 9 },
          cpm: { value: gbp(spend / (61.2 * scale)), change: -6 },
          cpc: { value: gbp(spend / (1470 * scale)), change: -9 },
          roas: { value: '6.8x', change: 21 },
        },
        campaigns: [
          { name: 'Christmas parties — local video views', spend: 180 * scale, impressions: Math.round(32100 * scale), clicks: Math.round(610 * scale), ctr: 1.9, roas: null },
          { name: 'Christmas parties — retargeting', spend: 140 * scale, impressions: Math.round(14800 * scale), clicks: Math.round(560 * scale), ctr: 3.78, roas: 11.2 },
          { name: 'Sunday lunch — 10 miles', spend: 100 * scale, impressions: Math.round(14300 * scale), clicks: Math.round(300 * scale), ctr: 2.1, roas: 4.1 },
        ],
      }
    }
    case 'pages':
      return demoPages(scale)
    case 'utms':
      return [
        { source: 'facebook', medium: 'paid_social', campaign: 'christmas_parties_2026', sessions: Math.round(540 * scale), bookingStarts: Math.round(38 * scale), conversionRate: 7 },
        { source: 'mailchimp', medium: 'email', campaign: 'christmas_party_launch', sessions: Math.round(210 * scale), bookingStarts: Math.round(19 * scale), conversionRate: 9 },
        { source: 'instagram', medium: 'paid_social', campaign: 'sunday_lunch', sessions: Math.round(160 * scale), bookingStarts: Math.round(6 * scale), conversionRate: 3.8 },
        { source: 'google', medium: 'organic', campaign: '(organic)', sessions: Math.round(1650 * scale), bookingStarts: Math.round(22 * scale), conversionRate: 1.3 },
      ]
    case 'seo': {
      const end = new Date(); end.setDate(end.getDate() - 2)
      const start = new Date(end); start.setDate(end.getDate() - (days - 1))
      const row = (key: string, clicks: number, impressions: number, position: number) =>
        ({ key, clicks: Math.round(clicks * scale), impressions: Math.round(impressions * scale), ctr: Math.round((clicks / impressions) * 1000) / 10, position })
      return {
        current: { clicks: Math.round(1320 * scale), impressions: Math.round(38400 * scale), ctr: 3.4, position: 14.2 },
        previous: { clicks: Math.round(1140 * scale), impressions: Math.round(35100 * scale), ctr: 3.2, position: 16.8 },
        topQueries: [
          row('demo golf club', 410, 1900, 1.2), row('christmas party venue near me', 96, 5200, 7.4),
          row('golf club christmas lunch', 71, 2300, 5.1), row('wedding venue golf club', 44, 3100, 9.8),
          row('sunday lunch near me', 38, 6400, 12.6), row('golf membership prices', 35, 1700, 8.3),
        ],
        topPages: [
          row('https://example.com/', 620, 9800, 3.1), row('https://example.com/christmas-parties/', 180, 7600, 6.2),
          row('https://example.com/weddings/', 95, 4900, 8.9), row('https://example.com/membership/', 88, 3600, 7.7),
        ],
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      }
    }
  }
}

function demoPages(scale: number) {
  return [
    { page: '/', sessions: 1620, bookingStarts: 28 },
    { page: '/christmas-parties/', sessions: 690, bookingStarts: 61 },
    { page: '/clubhouse/sunday-lunch/', sessions: 410, bookingStarts: 17 },
    { page: '/weddings/', sessions: 330, bookingStarts: 9 },
    { page: '/membership/', sessions: 290, bookingStarts: 6 },
    { page: '/visitors/green-fees/', sessions: 240, bookingStarts: 3 },
  ].map((p) => {
    const sessions = Math.round(p.sessions * scale)
    const bookingStarts = Math.round(p.bookingStarts * scale)
    return { page: p.page, sessions, bookingStarts, conversionRate: sessions ? Math.round((bookingStarts / sessions) * 1000) / 10 : 0 }
  })
}
