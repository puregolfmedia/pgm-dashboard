'use client'

import { useCallback, useEffect, useState, FormEvent } from 'react'
import { useActiveClient } from '@/lib/useActiveClient'
import DashboardHeader from '@/components/layout/DashboardHeader'
import MetricCard from '@/components/dashboard/MetricCard'
import GoalProgressList from '@/components/dashboard/GoalProgressList'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { GoalProgress } from '@/lib/goals'

const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

const PERIODS = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 12 months', value: 366 },
]

const STATUS_LABEL: Record<string, string> = { NEW: 'New', CONTACTED: 'Contacted', BOOKED: 'Booked', LOST: 'Not going ahead' }
const STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-100',
  CONTACTED: 'bg-amber-50 text-amber-700 border-amber-100',
  BOOKED: 'bg-green-50 text-green-700 border-green-100',
  LOST: 'bg-gray-50 text-gray-500 border-gray-200',
}

const emptyForm = { name: '', email: '', phone: '', category: '', eventDate: '', message: '' }

export default function EnquiriesPage() {
  const { clientId, isAdmin, ready, missingClientMessage } = useActiveClient()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<any>(null)
  const [goals, setGoals] = useState<GoalProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    if (!clientId) return
    fetch(`/api/dashboard/enquiries?clientId=${clientId}&days=${days}`)
      .then((r) => r.json())
      .then((res) => { if (res.error) setError(res.error); else { setData(res.data); setError(null) } })
      .catch(() => setError('Failed to load enquiries'))
      .finally(() => setLoading(false))
    fetch(`/api/dashboard/goals?clientId=${clientId}`).then((r) => r.json()).then((r) => setGoals(r.data ?? [])).catch(() => {})
  }, [clientId, days])

  useEffect(() => {
    if (!clientId) {
      if (ready) { setError(missingClientMessage); setLoading(false) }
      return
    }
    setLoading(true)
    load()
  }, [clientId, ready, missingClientMessage, load])

  async function update(id: string, change: Record<string, unknown>) {
    const res = await fetch(`/api/dashboard/enquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change),
    }).then((r) => r.json())
    if (res.error) { alertInline(res.error); return }
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this enquiry permanently?')) return
    await fetch(`/api/dashboard/enquiries/${id}`, { method: 'DELETE' })
    load()
  }

  const [inlineError, setInlineError] = useState('')
  function alertInline(msg: string) { setInlineError(msg); setTimeout(() => setInlineError(''), 4000) }

  async function add(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const res = await fetch(`/api/dashboard/enquiries?clientId=${clientId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).then((r) => r.json())
    if (res.error) { setFormError(res.error); return }
    setForm(emptyForm)
    setAdding(false)
    load()
  }

  const rows: any[] = (data?.enquiries ?? []).filter((e: any) =>
    (statusFilter === 'ALL' || e.status === statusFilter) &&
    (categoryFilter === 'ALL' || (e.category ?? '') === categoryFilter))
  const s = data?.summary

  return (
    <>
      <DashboardHeader title="Enquiries" />
      <div className="px-4 sm:px-8 py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === p.value
                  ? 'bg-pgm-green text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-pgm-green hover:text-pgm-green'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {clientId && <Button size="sm" onClick={() => setAdding((a) => !a)}>{adding ? 'Cancel' : '+ Add enquiry'}</Button>}
        </div>

        {error ? (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : (
          <>
            {adding && (
              <form onSubmit={add} className="bg-white border border-[#E8E8E8] rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-medium text-pgm-ink">Add an enquiry</h2>
                  <p className="text-xs text-gray-400 mt-0.5">For enquiries that came in by phone, email or in person. Website form enquiries appear automatically.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input label="Type of enquiry" placeholder="e.g. Christmas party" list="enquiry-categories"
                    value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input label="Event date (if known)" placeholder="e.g. Fri 12 Dec" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                  <Input label="Notes" placeholder="Party size, what they asked about…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <datalist id="enquiry-categories">
                  {(data?.categories ?? []).map((c: string) => <option key={c} value={c} />)}
                </datalist>
                {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
                <Button type="submit">Save enquiry</Button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard label="Enquiries received" value={s ? String(s.total) : '—'} change={0} loading={loading} />
              <MetricCard label="Still to follow up" help="New or contacted enquiries that aren’t booked or closed yet." value={s ? String(s.open) : '—'} change={0} loading={loading} />
              <MetricCard label="Enquiries booked" value={s ? `${s.booked} (${s.conversionRate}%)` : '—'} change={0} loading={loading} />
              <MetricCard label="Booked revenue" value={s ? gbp(s.bookedValue) : '—'} change={0} loading={loading} />
            </div>

            <GoalProgressList goals={goals} />

            <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm font-medium text-pgm-ink">All enquiries</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Update the status as each one progresses. When one is booked, add its value so revenue is tracked.</p>
                </div>
                <div className="flex gap-2">
                  <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-pgm-ink bg-white">
                    <option value="ALL">All statuses</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {(data?.categories?.length ?? 0) > 0 && (
                    <select aria-label="Filter by type" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-pgm-ink bg-white">
                      <option value="ALL">All types</option>
                      {data.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </div>
              {inlineError && <p className="text-sm text-red-600 bg-red-50 px-5 py-2">{inlineError}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-pgm-cream">
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Received</th>
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Who</th>
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Type</th>
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Event date</th>
                      <th className="text-left px-5 py-3 font-medium text-pgm-ink">Status</th>
                      <th className="text-right px-5 py-3 font-medium text-pgm-ink">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>}
                    {!loading && rows.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No enquiries for this period yet</td></tr>
                    )}
                    {!loading && rows.map((e) => (
                      <EnquiryRow key={e.id} e={e} isAdmin={isAdmin} open={expanded === e.id}
                        onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                        onUpdate={(c) => update(e.id, c)} onDelete={() => remove(e.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function EnquiryRow({ e, isAdmin, open, onToggle, onUpdate, onDelete }: {
  e: any; isAdmin: boolean; open: boolean
  onToggle: () => void; onUpdate: (c: Record<string, unknown>) => void; onDelete: () => void
}) {
  const [value, setValue] = useState(e.bookedValue != null ? String(e.bookedValue) : '')
  const [notes, setNotes] = useState(e.staffNotes ?? '')
  useEffect(() => { setValue(e.bookedValue != null ? String(e.bookedValue) : '') }, [e.bookedValue])

  const received = new Date(e.receivedAt)
  return (
    <>
      <tr className="hover:bg-gray-50/50 align-top">
        <td className="px-5 py-3 text-gray-500 whitespace-nowrap tabular-nums">
          {received.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          <span className="block text-xs text-gray-400">{e.source === 'form' ? 'Website form' : 'Added by hand'}</span>
        </td>
        <td className="px-5 py-3">
          <button onClick={onToggle} className="text-left text-pgm-ink font-medium hover:underline" aria-expanded={open}>
            {e.name || e.email || e.phone || 'Unnamed'}
          </button>
          <span className="block text-xs text-gray-400">{[e.email, e.phone].filter(Boolean).join(' · ')}</span>
        </td>
        <td className="px-5 py-3 text-gray-600">{e.category || '—'}</td>
        <td className="px-5 py-3 text-gray-600">{e.eventDate || '—'}</td>
        <td className="px-5 py-3">
          <select aria-label="Status" value={e.status} onChange={(ev) => onUpdate({ status: ev.target.value })}
            className={`text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_STYLE[e.status]}`}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </td>
        <td className="px-5 py-3 text-right">
          {e.status === 'BOOKED' ? (
            <div className="inline-flex items-center gap-1">
              <span className="text-gray-400 text-xs">£</span>
              <input aria-label="Booked value in pounds" inputMode="decimal" value={value} placeholder="0"
                onChange={(ev) => setValue(ev.target.value.replace(/[^0-9.]/g, ''))}
                onBlur={() => { if (value !== (e.bookedValue != null ? String(e.bookedValue) : '')) onUpdate({ bookedValue: value }) }}
                className="w-20 text-right text-sm border border-gray-200 rounded-md px-2 py-1 tabular-nums" />
            </div>
          ) : <span className="text-gray-300">—</span>}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/60">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">What they wrote</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{e.message || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">Our notes</label>
                <textarea rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)}
                  onBlur={() => { if (notes !== (e.staffNotes ?? '')) onUpdate({ staffNotes: notes }) }}
                  placeholder="Called back 3 Nov, sent menu…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white" />
                {isAdmin && (
                  <button onClick={onDelete} className="text-xs text-red-600 hover:underline mt-2">Delete enquiry</button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
