'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(n)
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

export const LEVEL: Record<string, { text: string; cls: string }> = {
  problem: { text: 'Needs attention', cls: 'bg-red-50 text-red-700 border-red-100' },
  warning: { text: 'Check tracking', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  ok: { text: 'All working', cls: 'bg-green-50 text-green-700 border-green-100' },
  'not-set-up': { text: 'Not set up', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  demo: { text: 'Demo club', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
}

/** Admin home: every club's health and headline numbers at a glance. */
export default function AllClientsOverview() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [checking, setChecking] = useState(false)

  const load = useCallback((fresh = false) => {
    setChecking(true)
    fetch(`/api/admin/health${fresh ? '?fresh=1' : ''}`)
      .then((r) => r.json()).then((r) => setRows(r.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setChecking(false))
  }, [])
  useEffect(() => load(), [load])

  if (rows === null) {
    return <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">Checking every club’s tracking…</div>
  }
  const attention = rows.filter((r) => r.level === 'problem' || r.level === 'warning').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {rows.length} club{rows.length === 1 ? '' : 's'}
          {attention > 0 && <> · <span className="text-red-700 font-medium">{attention} need{attention === 1 ? 's' : ''} attention</span></>}
        </p>
        <button onClick={() => load(true)} disabled={checking} className="text-xs text-pgm-green hover:underline disabled:opacity-50">
          {checking ? 'Checking…' : 'Re-check now'}
        </button>
      </div>

      {rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">No clients yet. Create your first one.</div>
      )}

      {rows.map((r) => (
        <div key={r.clientId} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-pgm-ink">{r.name}</h2>
              <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${LEVEL[r.level]?.cls}`}>{LEVEL[r.level]?.text}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href={`/admin/clients/${r.clientId}`} className="text-pgm-green hover:underline">Settings</Link>
              <Link href={`/dashboard?viewAs=${r.clientId}`} className="text-gray-500 hover:text-pgm-ink hover:underline">View dashboard</Link>
            </div>
          </div>

          {r.issues?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {r.issues.map((i: any, n: number) => (
                <li key={n} className={`text-sm rounded-lg px-3 py-2 ${i.level === 'problem' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{i.text}</li>
              ))}
            </ul>
          )}

          {r.stats && (
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              <Stat label="Website visits (30 days)" value={r.stats.sessions30 != null ? nf(r.stats.sessions30) : '—'}
                sub={r.stats.sessionsChange != null ? `${r.stats.sessionsChange > 0 ? '↑' : r.stats.sessionsChange < 0 ? '↓' : ''} ${Math.abs(r.stats.sessionsChange)}% vs first half` : undefined} />
              <Stat label={`${r.stats.keyLabel} (7 days)`} value={r.stats.keyActions7 != null ? nf(r.stats.keyActions7) : '—'} />
              <Stat label="Enquiries (30 days)" value={nf(r.stats.enquiries30)} />
              <Stat label="Booked (30 days)" value={`${r.stats.booked30} · ${gbp(r.stats.bookedValue30)}`} />
              <Stat label="Club last logged in" value={r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Never'} />
            </dl>
          )}
          <p className="text-[11px] text-gray-300 mt-3">Checked {new Date(r.checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-semibold text-pgm-ink tabular-nums mt-0.5">{value}</dd>
      {sub && <dd className="text-[11px] text-gray-400">{sub}</dd>}
    </div>
  )
}
