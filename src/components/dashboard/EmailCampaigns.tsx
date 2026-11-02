'use client'

import { Fragment, useState } from 'react'
import MetricCard from '@/components/dashboard/MetricCard'
import Icon from '@/components/ui/Icon'
import type { ABTest } from '@/lib/mailchimp'

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(n)
const CRITERIA: Record<string, string> = {
  opens: 'the most opens',
  clicks: 'the most clicks',
  total_revenue: 'the most revenue',
  manual: 'the version chosen by hand',
}

/** Every email campaign since the club's start date, with open and click rates, and any A/B tests. */
export default function EmailCampaigns({ data, loading, error }: { data: any; loading: boolean; error: string | null }) {
  const [open, setOpen] = useState<string | null>(null)
  if (error) {
    return <p className="text-sm text-gray-400 bg-white border border-pgm-line rounded-xl p-5">{error}</p>
  }
  const campaigns: any[] = data?.campaigns ?? []
  const tests = campaigns.filter((c) => c.abTest)

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${tests.length ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 sm:gap-4`}>
        <MetricCard label="Emails sent" help="How many email campaigns went out." loading={loading}
          value={data ? String(campaigns.length) : '—'} change={0} />
        <MetricCard label="Average open rate" loading={loading} change={0}
          help="Of the people each email reached, the % who opened it — the same figure Mailchimp shows. Automatic opens by Apple Mail are left out, so this is people who actually opened it."
          value={data ? `${data.avgOpenRate}%` : '—'} />
        <MetricCard label="Average click rate" loading={loading} change={0}
          help="Of the people each email reached, the % who clicked a link in it — the best sign an email got people to act. Around 2–3% is typical."
          value={data ? `${data.avgClickRate}%` : '—'} />
        {tests.length > 0 && (
          <MetricCard label="A/B tests" loading={loading} change={0}
            help="Emails where two or more versions were tried on part of the list first, and the best one sent to everyone else. Open one below to compare."
            value={String(tests.length)} />
        )}
      </div>

      <div className="bg-white border border-pgm-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pgm-cream">
                <th className="text-left px-5 py-3 font-medium text-pgm-ink">Email</th>
                <th className="text-left px-5 py-3 font-medium text-pgm-ink">Sent</th>
                <th className="text-right px-5 py-3 font-medium text-pgm-ink">Sent to</th>
                <th className="text-right px-5 py-3 font-medium text-pgm-ink">Opened</th>
                <th className="text-right px-5 py-3 font-medium text-pgm-ink">Clicked a link</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && campaigns.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No emails sent in this time yet</td></tr>
              )}
              {!loading && campaigns.map((c) => {
                const expanded = open === c.id
                return (
                  <Fragment key={c.id}>
                    <tr className={`border-t border-pgm-line/60 ${expanded ? 'bg-pgm-page/70' : 'hover:bg-pgm-page/50'}`}>
                      <td className="px-5 py-3 text-pgm-ink max-w-sm">
                        {c.name}
                        {c.abTest && (
                          <button type="button" onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded}
                            className={`mt-1.5 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors print:hidden ${expanded
                              ? 'bg-pgm-green text-white border-pgm-green'
                              : 'bg-[#FBF6EA] text-[#7A5D1C] border-[#E9DBB5] hover:border-pgm-gold'}`}>
                            <Icon name="split" className="w-3.5 h-3.5" />
                            A/B test · {c.abTest.variants.length} versions
                            <Icon name="chevron" className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} strokeWidth={2.2} />
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap align-top">
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-600 align-top">{nf(c.sent)}</td>
                      <td className="px-5 py-3 text-right tabular-nums align-top">
                        <span className="font-semibold text-pgm-ink">{c.openRate.toFixed(1)}%</span>
                        <span className="block text-xs text-gray-400">{nf(c.opened)} people</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums align-top">
                        <span className="font-semibold text-pgm-ink">{c.clickRate.toFixed(1)}%</span>
                        <span className="block text-xs text-gray-400">{nf(c.clicked)} people</span>
                      </td>
                    </tr>
                    {c.abTest && expanded && (
                      <tr className="bg-pgm-page/70">
                        <td colSpan={5} className="px-5 pb-5 pt-1">
                          <ABTestResults test={c.abTest} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** The versions of one A/B test side by side, with the winner marked. */
function ABTestResults({ test }: { test: ABTest }) {
  const maxOpen = Math.max(1, ...test.variants.map((v) => v.openRate ?? 0))
  const maxClick = Math.max(0.1, ...test.variants.map((v) => v.clickRate ?? 0))
  const winner = test.variants.find((v) => v.winner)
  const others = test.variants.filter((v) => !v.winner && v.openRate != null)
  const metric = test.winnerCriteria === 'clicks' ? 'clickRate' : 'openRate'
  const runnerUp = others.sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))[0]
  const lift = winner?.[metric] != null && runnerUp?.[metric] ? Math.round(((winner[metric]! - runnerUp[metric]!) / runnerUp[metric]!) * 100) : null

  const how = [
    `Tested: ${test.tested.toLowerCase()}`,
    test.testSize ? `on ${test.testSize}% of the list` : '',
    test.waitHours ? `for ${test.waitHours} hour${test.waitHours === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="rounded-xl border border-pgm-line bg-white p-4 sm:p-5">
      <p className="text-[13px] text-gray-600">
        {how}. {test.winnerCriteria && test.winnerCriteria !== 'manual'
          ? <>The version with {CRITERIA[test.winnerCriteria] ?? test.winnerCriteria} then went to everyone else.</>
          : test.winnerCriteria === 'manual' ? <>The winner was picked by hand and sent to everyone else.</> : null}
      </p>
      <div className={`grid gap-3 mt-4 ${test.variants.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {test.variants.map((v) => (
          <div key={v.label} className={`rounded-lg border p-4 ${v.winner ? 'border-pgm-gold bg-[#FDFAF1]' : 'border-pgm-line'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${v.winner ? 'bg-pgm-gold text-white' : 'bg-pgm-cream text-pgm-green'}`}>
                {v.label}
              </span>
              {v.winner && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7A5D1C]">
                  <Icon name="trophy" className="w-4 h-4" />Winner
                </span>
              )}
            </div>
            <p className="font-serif text-[16px] leading-snug text-pgm-ink mt-3">“{v.description}”</p>
            {v.openRate == null ? (
              <p className="text-xs text-gray-400 mt-4">Mailchimp didn’t provide separate results for this version.</p>
            ) : (
              <dl className="mt-4 space-y-3">
                {([['Opened', v.openRate, maxOpen], ['Clicked a link', v.clickRate, maxClick]] as const).map(([name, value, max]) => (
                  <div key={name}>
                    <div className="flex items-baseline justify-between text-xs">
                      <dt className="text-gray-500">{name}</dt>
                      <dd className="font-semibold text-pgm-ink tabular-nums text-sm">{value != null ? `${value.toFixed(1)}%` : '—'}</dd>
                    </div>
                    <div className="h-1.5 bg-pgm-cream rounded-full mt-1.5 overflow-hidden" aria-hidden>
                      <div className={`h-full rounded-full ${v.winner ? 'bg-pgm-gold' : 'bg-[#7FA58C]'}`} style={{ width: `${((value ?? 0) / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
            )}
            {v.recipients != null && <p className="text-[11.5px] text-gray-400 mt-3">Sent to {nf(v.recipients)} people in the test</p>}
          </div>
        ))}
      </div>
      {winner && runnerUp && lift != null && lift > 0 && (
        <p className="text-[13px] text-pgm-green mt-4 flex items-center gap-2">
          <Icon name="trophy" className="w-4 h-4 text-pgm-gold" />
          Version {winner.label} got {lift}% more {metric === 'clickRate' ? 'clicks' : 'opens'} than version {runnerUp.label}.
        </p>
      )}
    </div>
  )
}
