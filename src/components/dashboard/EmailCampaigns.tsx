'use client'

import MetricCard from '@/components/dashboard/MetricCard'

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(n)

/** Every email campaign since the club's start date, with open and click rates. */
export default function EmailCampaigns({ data, loading, error }: { data: any; loading: boolean; error: string | null }) {
  if (error) {
    return <p className="text-sm text-gray-400 bg-white border border-pgm-line rounded-xl p-5">{error}</p>
  }
  const campaigns: any[] = data?.campaigns ?? []
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Emails sent" help="How many email campaigns went out." loading={loading}
          value={data ? String(campaigns.length) : '—'} change={0} />
        <MetricCard label="Average open rate" loading={loading} change={0}
          help="Of the people each email reached, the % who opened it — the same figure Mailchimp shows. Automatic opens by Apple Mail are left out, so this is people who actually opened it."
          value={data ? `${data.avgOpenRate}%` : '—'} />
        <MetricCard label="Average click rate" loading={loading} change={0}
          help="Of the people each email reached, the % who clicked a link in it — the best sign an email got people to act. Around 2–3% is typical."
          value={data ? `${data.avgClickRate}%` : '—'} />
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
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && campaigns.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No emails sent in this time yet</td></tr>
              )}
              {!loading && campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-pgm-ink max-w-sm">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {c.sentAt ? new Date(c.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-600">{nf(c.sent)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className="font-semibold text-pgm-ink">{c.openRate.toFixed(1)}%</span>
                    <span className="block text-xs text-gray-400">{nf(c.opened)} people</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className="font-semibold text-pgm-ink">{c.clickRate.toFixed(1)}%</span>
                    <span className="block text-xs text-gray-400">{nf(c.clicked)} people</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
