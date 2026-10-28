'use client'

import { useEffect, useMemo, useState } from 'react'
import { useActiveClient } from '@/lib/useActiveClient'
import DashboardHeader from '@/components/layout/DashboardHeader'
import GoalProgressList from '@/components/dashboard/GoalProgressList'
import Button from '@/components/ui/Button'
import { pctChange } from '@/lib/utils'
import type { GoalProgress } from '@/lib/goals'

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const num = (v: unknown) => (typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : typeof v === 'number' ? v : NaN)

/** "up 18%", "down 4%", "level" — compared with the month before. */
function trend(change: number | null | undefined) {
  if (change == null || !Number.isFinite(change)) return ''
  if (change === 0) return ' — about the same as the month before'
  return change > 0 ? ` — up ${change}% on the month before` : ` — down ${Math.abs(change)}% on the month before`
}

function monthOptions() {
  const out: { value: string; label: string }[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 0; i < 13; i++) {
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    })
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

async function get(url: string) {
  try {
    const r = await fetch(url).then((res) => res.json())
    return r.error ? null : r.data
  } catch { return null }
}

export default function ReportPage() {
  const { clientId, ready, missingClientMessage } = useActiveClient()
  const months = useMemo(monthOptions, [])
  // Default to last month, unless this month is already well under way
  const [month, setMonth] = useState(new Date().getDate() >= 25 ? months[0].value : months[1].value)
  const [d, setD] = useState<any>(null)
  const [club, setClub] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { if (ready) setLoading(false); return }
    setLoading(true)
    const { from, to } = monthRange(month)
    const q = `clientId=${clientId}&from=${from}&to=${to}`
    Promise.all([
      get(`/api/dashboard/overview?${q}`), get(`/api/dashboard/enquiries?${q}`), get(`/api/dashboard/email?${q}`),
      get(`/api/dashboard/paid-social?${q}`), get(`/api/dashboard/seo?${q}`), get(`/api/dashboard/notes?${q}`),
      get(`/api/dashboard/goals?clientId=${clientId}`), get(`/api/dashboard/club?clientId=${clientId}`),
    ]).then(([overview, enquiries, email, paid, seo, notes, goals, clubInfo]) => {
      setD({ overview, enquiries, email, paid, seo, notes: notes ?? [], goals: (goals ?? []) as GoalProgress[] })
      setClub(clubInfo?.name ?? '')
      setLoading(false)
    })
  }, [clientId, ready, month])

  const monthLabel = months.find((m) => m.value === month)?.label ?? month
  const brief = useMemo(() => (d ? buildSummary(d) : []), [d])

  return (
    <>
      <div className="print:hidden"><DashboardHeader title="Monthly report" /></div>
      <div className="px-4 sm:px-8 py-6 space-y-5 max-w-3xl">
        <div className="flex items-center gap-3 flex-wrap print:hidden">
          <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-pgm-ink bg-white">
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={loading}>Print or save as PDF</Button>
          <p className="text-xs text-gray-400">Tip: in the print window choose “Save as PDF” to email it.</p>
        </div>

        {!clientId && ready ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center text-sm text-gray-400">{missingClientMessage}</div>
        ) : loading ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl h-96 animate-pulse" />
        ) : (
          <article className="bg-white border border-[#E8E8E8] rounded-2xl p-6 sm:p-8 space-y-7 print:border-0 print:p-0">
            <header>
              <p className="text-xs uppercase tracking-widest text-gray-400">Monthly report · prepared by Pure Golf Media</p>
              <h1 className="text-2xl font-semibold text-pgm-ink mt-1">{club}{club ? ' — ' : ''}{monthLabel}</h1>
            </header>

            <section>
              <h2 className="text-sm font-semibold text-pgm-ink mb-2">The month in brief</h2>
              {brief.length ? (
                <ul className="space-y-2">
                  {brief.map((line, i) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                      <span className="text-pgm-green" aria-hidden>•</span><span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-400">No data was recorded for this month yet.</p>}
            </section>

            {d.goals.length > 0 && (
              <section className="[&>div]:border-0 [&>div]:p-0">
                <GoalProgressList goals={d.goals} />
              </section>
            )}

            {d.notes.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-pgm-ink mb-2">What we did this month</h2>
                <ul className="space-y-1.5">
                  {d.notes.map((n: any) => (
                    <li key={n.id} className="text-sm text-gray-700 flex gap-3">
                      <span className="text-gray-400 tabular-nums w-14 shrink-0">{new Date(n.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      <span>{n.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <KeyNumbers d={d} />

            <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
              Figures come from Google Analytics, Google Search Console, Mailchimp, Meta and the club’s enquiries log.
              “The month before” means the same number of days immediately before.
            </p>
          </article>
        )}
      </div>
    </>
  )
}

function buildSummary(d: any): string[] {
  const lines: string[] = []
  const m = d.overview?.metrics
  const label = d.overview?.labels?.booking ?? 'booking starts'

  if (m && num(m.sessions.value) > 0) {
    lines.push(`${m.sessions.value} visits to the website${trend(m.sessions.change)}.`)
    const top = d.overview.trafficSources?.[0]
    if (top) lines.push(`Most visits came from ${top.source.replace('Organic Search', 'Google search (not ads)')}.`)
  }
  if (m && num(m.bookingStarts.value) > 0) {
    lines.push(`${m.bookingStarts.value} ${label} recorded on the website${trend(m.bookingStarts.change)}.`)
  }
  const e = d.enquiries
  if (e?.summary?.total > 0) {
    const booked = e.summary.booked
    lines.push(`${e.summary.total} enquir${e.summary.total === 1 ? 'y' : 'ies'} logged, ${booked} booked${booked ? ` (worth ${gbp(e.summary.bookedValue)})` : ''}${trend(pctChange(e.summary.total, e.previous?.total ?? 0) || null)}.`)
    if (e.summary.open > 0) lines.push(`${e.summary.open} enquir${e.summary.open === 1 ? 'y is' : 'ies are'} still to be followed up.`)
  }
  if (d.email?.campaigns?.length) {
    const n = d.email.campaigns.length
    lines.push(`${n} email${n === 1 ? '' : 's'} sent to ${nf(d.email.totalSent)} recipients in total, with an average open rate of ${d.email.avgOpenRate}% (golf clubs typically see 30–40%).`)
  }
  const p = d.paid?.metrics
  if (p && num(p.spend.value) > 0) {
    lines.push(`${p.spend.value} spent on Facebook & Instagram ads, reaching ${p.impressions.value} views and ${p.clicks.value} clicks${p.roas.value !== '—' ? ` — ${p.roas.value} return on ad spend` : ''}.`)
    if (m && m.costPerBooking.value !== '—') lines.push(`On average, each of those ${label} cost ${m.costPerBooking.value} in advertising.`)
  }
  const s = d.seo?.current
  if (s && s.impressions > 0) {
    const prev = d.seo.previous
    lines.push(`${nf(s.clicks)} people clicked through from Google search${trend(prev ? pctChange(s.clicks, prev.clicks) : null)}; the website appeared in searches ${nf(s.impressions)} times, at an average position of ${s.position.toFixed(1)}.`)
  }
  return lines
}

function KeyNumbers({ d }: { d: any }) {
  const rows: [string, string][] = []
  const m = d.overview?.metrics
  if (m) {
    rows.push(['Website visits', m.sessions.value], [d.overview.labels?.booking ?? 'Booking starts', m.bookingStarts.value])
    if (m.adSpend.value !== '—') rows.push(['Ad spend', m.adSpend.value], ['Return on ad spend', m.roas.value])
  }
  if (d.enquiries?.summary) {
    rows.push(['Enquiries', String(d.enquiries.summary.total)], ['Booked', `${d.enquiries.summary.booked} · ${gbp(d.enquiries.summary.bookedValue)}`])
  }
  if (d.email?.campaigns?.length) rows.push(['Emails sent', nf(d.email.totalSent)], ['Email open rate', `${d.email.avgOpenRate}%`])
  if (d.seo?.current) rows.push(['Clicks from Google', nf(d.seo.current.clicks)], ['Avg. Google position', d.seo.current.position.toFixed(1)])
  if (!rows.length) return null
  return (
    <section>
      <h2 className="text-sm font-semibold text-pgm-ink mb-2">Key numbers</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">{k}</dt>
            <dd className="text-lg font-semibold text-pgm-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
