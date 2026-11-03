'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import MetricCard, { Change } from '@/components/dashboard/MetricCard'
import BookingsByDayChart, { type ChartNote } from '@/components/dashboard/BookingsByDayChart'
import VisitsByDayChart from '@/components/dashboard/website/VisitsByDayChart'
import VisitLengthCard from '@/components/dashboard/website/VisitLengthCard'
import DeviceBreakdown from '@/components/dashboard/website/DeviceBreakdown'
import ChannelBreakdown from '@/components/dashboard/website/ChannelBreakdown'
import TopLandingPagesTable from '@/components/dashboard/TopLandingPagesTable'
import FilterBar, { useDateRange, compareText } from '@/components/dashboard/FilterBar'
import GoalProgressList from '@/components/dashboard/GoalProgressList'
import EnquiriesManager from '@/components/dashboard/EnquiriesManager'
import EmailCampaigns from '@/components/dashboard/EmailCampaigns'
import SearchTable from '@/components/dashboard/SearchTable'
import Section from '@/components/dashboard/Section'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { pctChange } from '@/lib/utils'
import { buildSummary } from '@/lib/summary'
import type { GoalProgress } from '@/lib/goals'

// The whole club dashboard on one page: a plain-English summary, the headline
// numbers, then one section per area, each saying what its numbers mean.

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
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
      const to = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) // last full day
      const from = start ?? new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
      setEmailLoading(true)
      load(`/api/dashboard/email?clientId=${clientId}&from=${from}&to=${to}`).then((e) => { setEmail(e); setEmailLoading(false) })
    })
  }, [clientId])

  if (!clientId) {
    return (
      <div className="px-4 sm:px-8 py-8">
        <div className="bg-white border border-pgm-line rounded-xl p-8 text-center">
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
  // Older cached visitor data lacks the daily and comparison figures
  const v = visitors.data?.dailySessions ? visitors.data : null
  const compareName = cmp.replace(/^vs /, '').replace(/^prior/, 'the previous')
  // Tell the reader when the chosen dates reach back before tracking began
  const rangeStart = range.from ?? new Date(Date.now() - range.days * 86_400_000).toISOString().slice(0, 10)
  const dayMonth = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const tracking = overview.data?.tracking as { websiteFrom: string | null; bookingsFrom: string | null } | undefined
  const briefNotes: string[] = []
  if (tracking?.websiteFrom && rangeStart < tracking.websiteFrom) {
    briefNotes.push(`Website tracking only started on ${dayMonth(tracking.websiteFrom)}, so there are no website figures before then.`)
  }
  if (tracking?.bookingsFrom && tracking.bookingsFrom !== tracking.websiteFrom && rangeStart < tracking.bookingsFrom) {
    briefNotes.push(`${label} are counted from ${dayMonth(tracking.bookingsFrom)} — earlier clicks, while tracking was being set up, are left out.`)
  }

  const scorecard: { label: string; value: string; change: number; sub?: string; help: string; loading: boolean }[] = [
    ...(websiteOn ? [
      { label: 'Website visits', value: m?.sessions.value ?? '—', change: m?.sessions.change ?? 0, sub: cmp, help: 'Visits to the club’s website.', loading },
      { label, value: m?.bookingStarts.value ?? '—', change: m?.bookingStarts.change ?? 0, sub: cmp,
        help: label === 'Booking starts' ? 'Clicks to book or enquire on the website.' : 'Recorded on the website.', loading },
    ] : []),
    { label: 'Enquiries received', value: s ? String(s.total) : '—', change: s && prev ? pctChange(s.total, prev.total) : 0, sub: cmp, help: 'From website forms, plus any added by hand.', loading: enquiriesLoading },
    { label: 'Booked revenue', value: s ? gbp(s.bookedValue) : '—', change: s && prev ? pctChange(s.bookedValue, prev.bookedValue) : 0,
      sub: s ? `${s.booked} booking${s.booked === 1 ? '' : 's'}` : undefined, help: 'Value of enquiries marked as booked.', loading: enquiriesLoading },
    ...(adsOn ? [
      { label: 'Ad spend', value: paid.data.metrics.spend.value, change: paid.data.metrics.spend.change, sub: cmp, help: 'Facebook & Instagram ads.', loading },
      ...(paid.data.metrics.roas.value !== '—' ? [{ label: 'Return on ad spend', value: paid.data.metrics.roas.value, change: paid.data.metrics.roas.change, sub: cmp, help: 'Revenue per £1 spent on ads.', loading }] : []),
    ] : []),
  ]

  const sections = [
    { id: 'enquiries', title: 'Enquiries', icon: 'enquiries' },
    websiteOn && { id: 'website', title: 'Website', icon: 'website' },
    emailOn && { id: 'email', title: 'Email', icon: 'email' },
    searchOn && { id: 'google', title: 'Google search', icon: 'search' },
    adsOn && { id: 'ads', title: 'Ads', icon: 'ads' },
  ].filter(Boolean) as { id: string; title: string; icon: string }[]
  // Jump to a section, briefly highlighting it so it's clear where you landed
  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    el.classList.remove('flash-section'); void el.offsetWidth; el.classList.add('flash-section')
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-12 max-w-6xl mx-auto">
      {/* Controls */}
      <div className="space-y-3 -mb-6 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar value={range} onChange={setRange} />
          <div className="flex items-center gap-3">
            {lastUpdated && <p className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
            <Button size="sm" variant="secondary" onClick={() => window.print()}>Print or save as PDF</Button>
          </div>
        </div>
        <nav aria-label="Jump to section" className="flex gap-1.5 flex-wrap items-center text-xs">
          <span className="text-gray-400 mr-1">Jump to</span>
          {sections.map((sec) => (
            <a key={sec.id} href={`#${sec.id}`} onClick={(e) => { e.preventDefault(); goTo(sec.id) }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-pgm-line text-pgm-green hover:border-pgm-green/50 hover:bg-pgm-cream transition-colors">
              <Icon name={sec.icon} className="w-3.5 h-3.5" />{sec.title}
            </a>
          ))}
        </nav>
      </div>

      {/* Header band: the club, the period in plain English, and the headline numbers */}
      <header className="rounded-2xl overflow-hidden border border-pgm-green shadow-[0_1px_0_rgba(8,71,36,0.08)]"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <div className="bg-pgm-green text-white px-6 sm:px-9 py-8">
          <div className="flex items-center gap-4 sm:gap-5">
            {club?.logoUrl && (
              <span className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
              </span>
            )}
            <h1 className="font-serif text-[34px] sm:text-[40px] leading-[1.05] font-semibold tracking-tight">{club?.name ?? 'Your club'}</h1>
          </div>
          <p className="text-white/75 text-[15px] mt-4">
            Marketing results for {range.from && range.to ? `${longDate(range.from)} to ${longDate(range.to)}` : `the last ${range.days} days`},
            compared with {compareName}.
            <span className="text-white/50"> Prepared by Pure Golf Media.</span>
          </p>
        </div>

        {/* In brief: four one-line bullet points; each opens its section */}
        <div className="relative bg-white px-6 sm:px-9 py-7 overflow-hidden">
          <span aria-hidden className="absolute -right-28 -top-28 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(184,145,58,0.10) 0%, rgba(184,145,58,0) 70%)' }} />
          <h2 className="relative flex items-center gap-2 font-serif text-[22px] text-pgm-green font-semibold">
            <Icon name="sparkle" className="w-5 h-5 text-pgm-gold" />In brief
          </h2>
          {loading ? (
            <div className="space-y-3.5 mt-5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-4 bg-pgm-page rounded animate-pulse" style={{ width: `${55 - i * 5}%` }} />)}</div>
          ) : brief.length ? (
            <ul className="relative mt-4 space-y-1">
              {brief.map((item, i) => (
                <li key={i}>
                  <button type="button" onClick={() => goTo(item.target)} title="See the detail"
                    className="group -mx-2 px-2 py-1.5 rounded-lg flex items-center gap-3 text-left hover:bg-pgm-page transition-colors">
                    <Icon name={item.icon} className="w-[18px] h-[18px] text-pgm-green shrink-0" />
                    <span className="font-serif text-[18px] leading-snug text-pgm-ink group-hover:text-pgm-green group-hover:underline decoration-pgm-green/30 underline-offset-4">
                      {item.text}
                    </span>
                    {item.change !== 0 && (
                      <span className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${item.change > 0 ? 'bg-[#E3F1E7] text-[#1E7A45]' : 'bg-[#F8E6E1] text-[#B4432F]'}`}
                        title={`${item.change > 0 ? 'Up' : 'Down'} ${Math.abs(item.change)}% ${cmp}`}>
                        <Icon name={item.change > 0 ? 'up' : 'down'} className="w-3.5 h-3.5" strokeWidth={2.4} />{Math.abs(item.change)}%
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="relative font-serif text-[17px] text-gray-500 mt-3">Nothing has been recorded for these dates yet.</p>}
          {!loading && briefNotes.length > 0 && (
            <div className="relative mt-4 space-y-1.5">
              {briefNotes.map((n) => (
                <p key={n} className="flex items-start gap-2 text-[13px] text-pgm-ink/75">
                  <Icon name="info" className="w-4 h-4 mt-px shrink-0 text-pgm-gold" />
                  {n}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* The scorecard: headline numbers in one ruled strip */}
        <dl className={`bg-white grid grid-cols-2 ${scorecard.length > 4 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} border-t-[3px] border-pgm-gold`}>
          {scorecard.map((c, i) => (
            <div key={c.label} className={`px-5 sm:px-6 py-5 border-pgm-line ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l' : ''}`}>
              <dt className="text-[13px] font-medium text-pgm-ink/70">{c.label}</dt>
              <dd className="text-[30px] leading-none font-semibold text-pgm-ink tabular-nums tracking-tight mt-2.5">
                {c.loading ? <span className="inline-block h-7 w-20 bg-pgm-cream rounded animate-pulse align-middle" /> : c.value}
              </dd>
              {!c.loading && <dd><Change change={c.change} period={c.sub === cmp ? undefined : c.sub} /></dd>}
              <dd className="text-[11.5px] text-gray-500 leading-snug mt-2">{c.help}</dd>
            </div>
          ))}
        </dl>
      </header>

      {warnings.map((w) => <p key={w} className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">{w}</p>)}

      <GoalProgressList goals={goals} />

      {/* Enquiries */}
      <Section icon="enquiries" id="enquiries" title="Enquiries and bookings"
        intro="Every enquiry from your website forms, plus ones taken by phone or in person. Update each one’s status as it progresses, and when it’s booked enter its value — that’s how booked revenue is worked out.">
        {enquiries.error ? <p className="text-sm text-gray-400">{enquiries.error}</p> : (
          <EnquiriesManager clientId={clientId} isAdmin={isAdmin} data={enquiries.data} loading={enquiriesLoading} onChanged={loadEnquiries} />
        )}
      </Section>

      {/* Website */}
      {websiteOn ? (
        <Section icon="website" id="website" tinted title="Your website" intro="Who visited the website, where they came from, what they used, and which pages brought them in. From Google Analytics.">
          {overview.error ? <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{overview.error}</p> : loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {[2, 1, 2, 1].map((span, i) => (
                <div key={i} className={`bg-white border border-pgm-line rounded-xl h-80 animate-pulse ${span === 2 ? 'lg:col-span-2' : ''}`} />
              ))}
            </div>
          ) : (
            <>
              {v && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                    <VisitsByDayChart className="lg:col-span-2" daily={v.dailySessions ?? []} totals={v} previous={v.previous} compareName={compareName} />
                    <VisitLengthCard now={v} prev={v.previous} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                    <ChannelBreakdown className="lg:col-span-2" data={v.channelBreakdown ?? []} label={label} />
                    <DeviceBreakdown data={v.deviceBreakdown ?? []} />
                  </div>
                </>
              )}
              <BookingsByDayChart data={overview.data?.dailyBookings ?? []} label={label} notes={notes} />
              <TopLandingPagesTable data={overview.data?.landingPages ?? []} label={label} />
            </>
          )}
        </Section>
      ) : isAdmin && <p className="text-xs text-gray-400">Website (Google Analytics) isn’t connected for this club yet — set it up in the club’s settings.</p>}

      {/* Email */}
      {emailOn ? (
        <Section icon="email" id="email" title="Email marketing"
          intro={`Every email sent${emailSince ? ` since ${longDate(emailSince)}` : ' in the last 90 days'}, how many people opened it, and how many clicked a link. This section isn’t affected by the dates chosen above.`}>
          <EmailCampaigns data={email.data} loading={emailLoading} error={email.error} />
        </Section>
      ) : isAdmin && <p className="text-xs text-gray-400">Email (Mailchimp) isn’t connected for this club yet.</p>}

      {/* Google search */}
      {searchOn ? (
        <Section icon="search" id="google" tinted title="Google search" intro="How your website shows up when people search on Google (not paid ads). Google’s figures run about two days behind.">
          {seo.error ? <p className="text-sm text-gray-400 bg-white border border-pgm-line rounded-xl p-5">{seo.error}</p> : (
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
        <Section icon="ads" id="ads" title="Facebook & Instagram ads" intro="What was spent on ads, how often they were seen and clicked, and what they brought back.">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard label="Times shown" help="How many times your ads appeared on screen." value={paid.data.metrics.impressions.value} change={paid.data.metrics.impressions.change} changePeriod={cmp} loading={loading} />
            <MetricCard label="Clicks" help="How many times people clicked your ads." value={paid.data.metrics.clicks.value} change={paid.data.metrics.clicks.change} changePeriod={cmp} loading={loading} />
            <MetricCard label="Click rate" help="The % of people who saw an ad and clicked it." value={paid.data.metrics.ctr.value} change={paid.data.metrics.ctr.change} changePeriod={cmp} loading={loading} />
            <MetricCard label="Cost per click" help="Ad spend divided by clicks." value={paid.data.metrics.cpc?.value ?? '—'} change={0} loading={loading} />
          </div>
          {(paid.data.campaigns ?? []).length > 0 && (
            <div className="bg-white border border-pgm-line rounded-xl overflow-x-auto">
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
