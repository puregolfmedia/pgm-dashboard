'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import MetricCard from '@/components/dashboard/MetricCard'
import BookingsByDayChart, { type ChartNote } from '@/components/dashboard/BookingsByDayChart'
import TrafficSourceChart from '@/components/dashboard/TrafficSourceChart'
import TopLandingPagesTable from '@/components/dashboard/TopLandingPagesTable'
import FilterBar, { useDateRange, compareText } from '@/components/dashboard/FilterBar'
import GoalProgressList from '@/components/dashboard/GoalProgressList'
import EnquiriesManager from '@/components/dashboard/EnquiriesManager'
import EmailCampaigns from '@/components/dashboard/EmailCampaigns'
import SearchTable from '@/components/dashboard/SearchTable'
import Section from '@/components/dashboard/Section'
import Button from '@/components/ui/Button'
import { pctChange } from '@/lib/utils'
import { buildSummary } from '@/lib/summary'
import type { GoalProgress } from '@/lib/goals'

// The whole club dashboard on one page: a plain-English summary, the headline
// numbers, then one section per area, each saying what its numbers mean.

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const minsSecs = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

interface Loaded<T> { data: T | null; error: string | null }
const empty = { data: null, error: null }

async function load(url: string): Promise<Loaded<any>> {
  try {
    const r = await fetch(url).then((res) => res.json())
    return r.error ? { data: null, error: r.error } : { data: r.data, error: null }
  } catch {
    return { data: null, error: 'Couldn’t load this section — please refresh.' }
  }
}

const notConnected = (e: string | null) => !!e && /not configured|Data source/i.test(e)

export default function ClubDashboard({ clientId, isAdmin }: { clientId: string | null; isAdmin: boolean }) {
  const [range, setRange, rangeQs] = useDateRange()
  const [loading, setLoading] = useState(true)
  const [club, setClub] = useState<any>(null)
  const [overview, setOverview] = useState<Loaded<any>>(empty)
  const [visitors, setVisitors] = useState<Loaded<any>>(empty)
  const [enquiries, setEnquiries] = useState<Loaded<any>>(empty)
  const [enquiriesLoading, setEnquiriesLoading] = useState(true)
  const [goals, setGoals] = useState<GoalProgress[]>([])
  const [notes, setNotes] = useState<ChartNote[]>([])
  const [seo, setSeo] = useState<Loaded<any>>(empty)
  const [paid, setPaid] = useState<Loaded<any>>(empty)
  const [email, setEmail] = useState<Loaded<any>>(empty)
  const [emailLoading, setEmailLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadEnquiries = useCallback(() => {
    if (!clientId) return
    load(`/api/dashboard/enquiries?clientId=${clientId}&${rangeQs}`).then((r) => { setEnquiries(r); setEnquiriesLoading(false) })
    load(`/api/dashboard/goals?clientId=${clientId}`).then((r) => setGoals(r.data ?? []))
  }, [clientId, rangeQs])

  // Everything that follows the date picker
  useEffect(() => {
    if (!clientId) { setLoading(false); return }
    setLoading(true)
    setEnquiriesLoading(true)
    const q = `clientId=${clientId}&${rangeQs}`
    loadEnquiries()
    Promise.all([
      load(`/api/dashboard/overview?${q}`), load(`/api/dashboard/visitors?${q}`), load(`/api/dashboard/notes?${q}`),
      load(`/api/dashboard/seo?${q}`), load(`/api/dashboard/paid-social?${q}`),
    ]).then(([o, v, n, s, p]) => {
      setOverview(o); setVisitors(v); setNotes(n.data ?? []); setSeo(s); setPaid(p)
      setLastUpdated(new Date())
      setLoading(false)
    })
  }, [clientId, rangeQs, loadEnquiries])

  // Email always covers everything since the club's start date
  useEffect(() => {
    if (!clientId) return
    load(`/api/dashboard/club?clientId=${clientId}`).then((c) => {
      setClub(c.data)
      const start = c.data?.reportingStartDate ? String(c.data.reportingStartDate).slice(0, 10) : null
      const to = new Date().toISOString().slice(0, 10)
      const from = start ?? new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
      setEmailLoading(true)
      load(`/api/dashboard/email?clientId=${clientId}&from=${from}&to=${to}`).then((e) => { setEmail(e); setEmailLoading(false) })
    })
  }, [clientId])

  if (!clientId) {
    return (
      <div className="px-4 sm:px-8 py-8">
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-8 text-center">
          {isAdmin ? (
            <p className="text-sm text-gray-500">Choose a club under <Link href="/admin" className="text-pgm-green underline">Clients</Link> and click “View dashboard”.</p>
          ) : (
            <p className="text-sm text-gray-500">No club is linked to this login. Please contact Pure Golf Media.</p>
          )}
        </div>
      </div>
    )
  }

  const m = overview.data?.metrics
  const label: string = overview.data?.labels?.booking ?? 'Booking starts'
  const cmp = compareText(range)
  const emailSince: string | null = club?.reportingStartDate ?? null
  const s = enquiries.data?.summary
  const prev = enquiries.data?.previous
  const adsOn = !!paid.data && !paid.error
  const searchOn = !notConnected(seo.error)
  const emailOn = !notConnected(email.error)
  const websiteOn = !notConnected(overview.error)
  const brief = loading ? [] : buildSummary({ overview: overview.data, enquiries: enquiries.data, email: email.data, emailSince, paid: paid.data, seo: seo.data }, cmp)
  const warnings: string[] = overview.data?.warnings ?? []

  const sections = [
    { id: 'enquiries', title: 'Enquiries' },
    websiteOn && { id: 'website', title: 'Website' },
    emailOn && { id: 'email', title: 'Email' },
    searchOn && { id: 'google', title: 'Google search' },
    adsOn && { id: 'ads', title: 'Ads' },
  ].filter(Boolean) as { id: string; title: string }[]

  return (
    <div className="px-4 sm:px-8 py-6 space-y-8 max-w-6xl">
      {/* Controls */}
      <div className="space-y-3 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar value={range} onChange={setRange} />
          <div className="flex items-center gap-3">
            {lastUpdated && <p className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
            <Button size="sm" variant="secondary" onClick={() => window.print()}>Print or save as PDF</Button>
          </div>
        </div>
        <nav aria-label="Jump to section" className="flex gap-2 flex-wrap text-xs">
          <span className="text-gray-400">Jump to:</span>
          {sections.map((sec) => (
            <a key={sec.id} href={`#${sec.id}`} className="text-pgm-green hover:underline">{sec.title}</a>
          ))}
        </nav>
      </div>

      {/* In brief */}
      <section aria-labelledby="brief-title" className="bg-white border border-[#E8E8E8] rounded-2xl p-6">
        <h2 id="brief-title" className="text-lg font-semibold text-pgm-ink">In brief</h2>
        <p className="text-sm text-gray-500 mt-0.5 mb-3">
          {range.from && range.to ? `${longDate(range.from)} to ${longDate(range.to)}` : `The last ${range.days} days`}, in plain English.
        </p>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />)}</div>
        ) : brief.length ? (
          <ul className="space-y-1.5">
            {brief.map((line, i) => (
              <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2"><span className="text-pgm-green" aria-hidden>•</span><span>{line}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-400">Nothing recorded for these dates yet.</p>}
        {warnings.map((w) => <p key={w} className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-3">{w}</p>)}
      </section>

      {/* At a glance */}
      <Section id="glance" title="At a glance" intro={`Your headline numbers. Green and red arrows compare with ${cmp.replace(/^vs /, '')}.`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {websiteOn && <MetricCard label="Website visits" help="Visits to your website. One person visiting twice counts as two."
            value={m?.sessions.value ?? '—'} change={m?.sessions.change ?? 0} changePeriod={cmp} loading={loading} />}
          {websiteOn && <MetricCard label={label}
            help={label === 'Booking starts' ? 'Times a visitor clicked to book or enquire on your website.' : `How many times this was recorded on your website: ${label}.`}
            value={m?.bookingStarts.value ?? '—'} change={m?.bookingStarts.change ?? 0} changePeriod={cmp} loading={loading} />}
          <MetricCard label="Enquiries received" help="Enquiries from your website forms, plus any added by hand."
            value={s ? String(s.total) : '—'} change={s && prev ? pctChange(s.total, prev.total) : 0} changePeriod={cmp} loading={enquiriesLoading} />
          <MetricCard label="Booked revenue" help="Total value of enquiries marked as booked."
            value={s ? `${gbp(s.bookedValue)}` : '—'} change={s && prev ? pctChange(s.bookedValue, prev.bookedValue) : 0} changePeriod={s ? `${s.booked} booked · ${cmp}` : cmp} loading={enquiriesLoading} />
          {adsOn && <MetricCard label="Ad spend" help="Spent on Facebook & Instagram ads."
            value={paid.data.metrics.spend.value} change={paid.data.metrics.spend.change} changePeriod={cmp} loading={loading} />}
          {adsOn && paid.data.metrics.roas.value !== '—' && <MetricCard label="Return on ad spend" help="Revenue tracked from ads for every £1 spent (e.g. 3x = £3 back per £1)."
            value={paid.data.metrics.roas.value} change={paid.data.metrics.roas.change} changePeriod={cmp} loading={loading} />}
        </div>
        <GoalProgressList goals={goals} />
      </Section>

      {/* Enquiries */}
      <Section id="enquiries" title="Enquiries and bookings"
        intro="Every enquiry from your website forms, plus ones taken by phone or in person. Update each one’s status as it progresses, and when it’s booked enter its value — that’s how booked revenue is worked out.">
        {enquiries.error ? <p className="text-sm text-gray-400">{enquiries.error}</p> : (
          <EnquiriesManager clientId={clientId} isAdmin={isAdmin} data={enquiries.data} loading={enquiriesLoading} onChanged={loadEnquiries} />
        )}
      </Section>

      {/* Website */}
      {websiteOn ? (
        <Section id="website" title="Your website" intro="Who visited your website, where they came from, and which pages brought them in. From Google Analytics.">
          {overview.error ? <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{overview.error}</p> : (
            <>
              {visitors.data && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <MetricCard label="People who visited" help="Different people, however many times each visited." value={nf(visitors.data.totalUsers)} change={0} loading={loading} />
                  <MetricCard label="First-time visitors" help="People visiting your website for the first time." value={nf(visitors.data.newUsers)} change={0} loading={loading} />
                  <MetricCard label="Average visit length" help="How long a typical visit lasts." value={minsSecs(visitors.data.avgSessionDuration)} change={0} loading={loading} />
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {loading ? <><div className="bg-white border border-[#E8E8E8] rounded-2xl h-72 animate-pulse" /><div className="bg-white border border-[#E8E8E8] rounded-2xl h-72 animate-pulse" /></> : (
                  <>
                    <BookingsByDayChart data={overview.data?.dailyBookings ?? []} label={label} notes={notes} />
                    <TrafficSourceChart data={overview.data?.trafficSources ?? []} />
                  </>
                )}
              </div>
              {!loading && <TopLandingPagesTable data={overview.data?.landingPages ?? []} label={label} />}
            </>
          )}
        </Section>
      ) : isAdmin && <p className="text-xs text-gray-400">Website (Google Analytics) isn’t connected for this club yet — set it up in the club’s settings.</p>}

      {/* Email */}
      {emailOn ? (
        <Section id="email" title="Email marketing"
          intro={`Every email sent${emailSince ? ` since ${longDate(emailSince)}` : ' in the last 90 days'}, how many people opened it, and how many clicked a link. This section isn’t affected by the dates chosen above.`}>
          <EmailCampaigns data={email.data} loading={emailLoading} error={email.error} />
        </Section>
      ) : isAdmin && <p className="text-xs text-gray-400">Email (Mailchimp) isn’t connected for this club yet.</p>}

      {/* Google search */}
      {searchOn ? (
        <Section id="google" title="Google search" intro="How your website shows up when people search on Google (not paid ads). Google’s figures run about two days behind.">
          {seo.error ? <p className="text-sm text-gray-400 bg-white border border-[#E8E8E8] rounded-2xl p-5">{seo.error}</p> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <MetricCard label="Clicks from Google" help="Times someone clicked through to your website from Google search results."
                  value={seo.data ? nf(seo.data.current.clicks) : '—'} change={seo.data ? pctChange(seo.data.current.clicks, seo.data.previous.clicks) : 0} changePeriod={cmp} loading={loading} />
                <MetricCard label="Times shown in Google" help="Times your website appeared in someone’s Google search results."
                  value={seo.data ? nf(seo.data.current.impressions) : '—'} change={seo.data ? pctChange(seo.data.current.impressions, seo.data.previous.impressions) : 0} changePeriod={cmp} loading={loading} />
                <MetricCard label="Average Google position" help="Where your website usually ranks. 1 is the top; 1–10 is the first page. Lower is better."
                  value={seo.data ? seo.data.current.position.toFixed(1) : '—'} change={0} changePeriod={seo.data?.previous?.position ? `was ${seo.data.previous.position.toFixed(1)}` : undefined} loading={loading} />
              </div>
              <SearchTable title="Top search terms" keyLabel="What people searched for" rows={(seo.data?.topQueries ?? []).slice(0, 10)}
                loading={loading} emptyText="No search data for these dates yet" />
            </>
          )}
        </Section>
      ) : isAdmin && <p className="text-xs text-gray-400">Google Search Console isn’t connected for this club yet.</p>}

      {/* Ads */}
      {adsOn ? (
        <Section id="ads" title="Facebook & Instagram ads" intro="What was spent on ads, how often they were seen and clicked, and what they brought back.">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard label="Times shown" help="How many times your ads appeared on screen." value={paid.data.metrics.impressions.value} change={paid.data.metrics.impressions.change} changePeriod={cmp} loading={loading} />
            <MetricCard label="Clicks" help="How many times people clicked your ads." value={paid.data.metrics.clicks.value} change={paid.data.metrics.clicks.change} changePeriod={cmp} loading={loading} />
            <MetricCard label="Click rate" help="The % of people who saw an ad and clicked it." value={paid.data.metrics.ctr.value} change={paid.data.metrics.ctr.change} changePeriod={cmp} loading={loading} />
            <MetricCard label="Cost per click" help="Ad spend divided by clicks." value={paid.data.metrics.cpc?.value ?? '—'} change={0} loading={loading} />
          </div>
          {(paid.data.campaigns ?? []).length > 0 && (
            <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-pgm-cream">
                  <th className="text-left px-5 py-3 font-medium text-pgm-ink">Ad campaign</th>
                  <th className="text-right px-5 py-3 font-medium text-pgm-ink">Spent</th>
                  <th className="text-right px-5 py-3 font-medium text-pgm-ink">Times shown</th>
                  <th className="text-right px-5 py-3 font-medium text-pgm-ink">Clicks</th>
                  <th className="text-right px-5 py-3 font-medium text-pgm-ink">Click rate</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {paid.data.campaigns.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="px-5 py-3 text-pgm-ink">{c.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{gbp(c.spend)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{nf(c.impressions)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{nf(c.clicks)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{c.ctr.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      ) : isAdmin && <p className="text-xs text-gray-400">Facebook & Instagram ads aren’t connected for this club yet.</p>}

      <p className="text-xs text-gray-400 border-t border-gray-200 pt-4">
        Figures come from Google Analytics, Google Search Console, Mailchimp, Meta and your enquiries list, and are refreshed every 10 minutes.
        Prepared by Pure Golf Media.
      </p>
    </div>
  )
}
