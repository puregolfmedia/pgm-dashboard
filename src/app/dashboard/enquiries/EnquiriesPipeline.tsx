'use client'

import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Icon from '@/components/ui/Icon'

// The enquiries pipeline: every enquiry for the club, as a list or a board,
// with a panel to follow each one from New to Joined / Booked.

type Status = 'NEW' | 'CONTACTED' | 'TOUR_BOOKED' | 'BOOKED' | 'LOST'
type View = 'board' | 'list' | 'results'
type Type = 'MEMBERSHIP' | 'WEDDING' | 'SOCIETY' | 'DRIVING_RANGE' | 'FUNCTION' | 'GENERAL'

const STAGES: { value: Status; label: string; dot: string }[] = [
  { value: 'NEW', label: 'New', dot: '#2F6FB5' },
  { value: 'CONTACTED', label: 'Contacted', dot: '#B8913A' },
  { value: 'TOUR_BOOKED', label: 'Tour / viewing booked', dot: '#7A5AA6' },
  { value: 'BOOKED', label: 'Joined / booked', dot: '#1E7A45' },
  { value: 'LOST', label: 'Lost', dot: '#9AA39D' },
]
const TYPES: { value: Type; label: string }[] = [
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'WEDDING', label: 'Wedding' },
  { value: 'SOCIETY', label: 'Society' },
  { value: 'DRIVING_RANGE', label: 'Driving range' },
  { value: 'FUNCTION', label: 'Function / party' },
  { value: 'GENERAL', label: 'General' },
]
const SOURCES: Record<string, string> = {
  website_form: 'Website form', facebook_lead: 'Facebook lead form', instagram_lead: 'Instagram lead form',
  phone: 'Phone', walk_in: 'Walk-in', email: 'Email', manual: 'Added by hand',
}
const PERIODS = [{ days: 30, label: 'Last 30 days' }, { days: 90, label: 'Last 90 days' }, { days: 365, label: 'Last 12 months' }, { days: 3650, label: 'All time' }]

const typeLabel = (t: Type) => TYPES.find((x) => x.value === t)?.label ?? t
const stageLabel = (s: Status, t: Type) =>
  s === 'BOOKED' ? (t === 'MEMBERSHIP' ? 'Joined' : 'Booked') : s === 'TOUR_BOOKED' ? (t === 'MEMBERSHIP' ? 'Tour booked' : 'Viewing booked') : STAGES.find((x) => x.value === s)!.label
const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
function ago(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : day(d)
}

export default function EnquiriesPipeline({ clientId, isAdmin }: { clientId: string | null; isAdmin: boolean }) {
  const [view, setView] = useState<View>('board')
  const [days, setDays] = useState(90)
  const [stage, setStage] = useState<'ALL' | Status>('ALL')
  const [type, setType] = useState<'ALL' | Type>('ALL')
  const [source, setSource] = useState('ALL')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // Remember the chosen view on this device
  useEffect(() => { try { const v = localStorage.getItem('pgm-enquiries-view'); if (v === 'list' || v === 'board' || v === 'results') setView(v) } catch { /* ignore */ } }, [])
  const chooseView = (v: View) => { setView(v); try { localStorage.setItem('pgm-enquiries-view', v) } catch { /* ignore */ } }

  const load = useCallback(async () => {
    if (!clientId) return
    const res = await fetch(`/api/dashboard/enquiries?clientId=${clientId}&days=${days}`).then((r) => r.json()).catch(() => null)
    setLoading(false)
    if (!res || res.error) { setError(res?.error ?? 'Could not load enquiries'); return }
    setError('')
    setData(res.data)
  }, [clientId, days])
  useEffect(() => { setLoading(true); load() }, [load])

  const all: any[] = data?.enquiries ?? []
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter((e) =>
      (stage === 'ALL' || e.status === stage) && (type === 'ALL' || e.type === type) && (source === 'ALL' || e.source === source) &&
      (!q || [e.name, e.email, e.phone, e.category].some((v) => v?.toLowerCase().includes(q))))
  }, [all, stage, type, source, search])

  async function moveTo(id: string, status: Status) {
    // Show the move straight away, then save it
    setData((d: any) => d && { ...d, enquiries: d.enquiries.map((e: any) => (e.id === id ? { ...e, status } : e)) })
    const res = await fetch(`/api/dashboard/enquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then((r) => r.json())
    if (res.error) setError(res.error)
    load()
  }

  if (!clientId) {
    return <div className="px-4 sm:px-8 py-8 text-sm text-gray-500">Choose a club under Admin → Clients → View to see its enquiries.</div>
  }

  const won = all.filter((e) => e.status === 'BOOKED')
  const open = all.filter((e) => ['NEW', 'CONTACTED', 'TOUR_BOOKED'].includes(e.status))
  const decided = won.length + all.filter((e) => e.status === 'LOST').length
  const stats = [
    { label: 'New, not yet contacted', value: String(all.filter((e) => e.status === 'NEW').length), note: 'Reply to these first' },
    { label: 'In progress', value: String(open.length), note: 'New, contacted or tour booked' },
    { label: 'Joined / booked', value: String(won.length), note: won.length ? `${gbp(won.reduce((s, e) => s + (e.bookedValue ?? 0), 0))} in value` : 'None yet' },
    { label: 'Conversion', value: all.length ? `${Math.round((won.length / all.length) * 100)}%` : '—', note: decided ? `of ${all.length} enquiries` : 'Shows once enquiries are won' },
  ]

  return (
    <div className="px-3 sm:px-8 py-4 sm:py-8 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-[30px] sm:text-[36px] leading-tight font-semibold text-pgm-green">Enquiries</h1>
          <p className="text-[14px] sm:text-[15px] text-gray-600 mt-1 max-w-2xl">
            Every enquiry in one place. Move each one along as you follow it up, so it’s clear who needs a reply and which campaigns bring in members and bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="View" className="inline-flex p-0.5 bg-white border border-pgm-line rounded-lg">
            {(['board', 'list', 'results'] as const).map((v) => (
              <button key={v} type="button" onClick={() => chooseView(v)} aria-pressed={view === v}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${view === v ? 'bg-pgm-green text-white' : 'text-gray-500 hover:text-pgm-green'}`}>
                {v === 'board' ? 'Board' : v === 'list' ? 'List' : 'Results'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>+ Add enquiry</Button>
        </div>
      </div>

      {/* Headline numbers */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-pgm-line rounded-xl overflow-hidden">
        {stats.map((s, i) => (
          <div key={s.label} className={`px-4 sm:px-5 py-4 border-pgm-line ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
            <dt className="text-xs text-gray-500">{s.label}</dt>
            <dd className="text-[26px] leading-none font-semibold text-pgm-ink tabular-nums mt-2">{loading ? '…' : s.value}</dd>
            <dd className="text-[11.5px] text-gray-400 mt-1.5">{s.note}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" aria-label="Search"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-pgm-line bg-white text-sm text-pgm-ink placeholder:text-gray-400" />
        </div>
        <Select label="Dates" value={String(days)} onChange={(v) => setDays(Number(v))} options={PERIODS.map((p) => ({ value: String(p.days), label: p.label }))} />
        <Select label="Type" value={type} onChange={(v) => setType(v as any)} options={[{ value: 'ALL', label: 'All types' }, ...TYPES]} />
        <Select label="Stage" value={stage} onChange={(v) => setStage(v as any)} options={[{ value: 'ALL', label: 'All stages' }, ...STAGES]} />
        <Select label="Source" value={source} onChange={setSource} options={[{ value: 'ALL', label: 'All sources' }, ...Object.entries(SOURCES).map(([value, label]) => ({ value, label }))]} />
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <div className="h-64 bg-white border border-pgm-line rounded-xl animate-pulse" />
      ) : all.length === 0 ? (
        <div className="bg-white border border-dashed border-pgm-line rounded-xl px-6 py-14 text-center">
          <Icon name="enquiries" className="w-8 h-8 text-pgm-green mx-auto" />
          <p className="font-serif text-xl text-pgm-ink mt-3">No enquiries for these dates</p>
          <p className="text-sm text-gray-500 mt-1">Website form enquiries arrive here automatically. Add phone and walk-in enquiries with “Add enquiry”.</p>
        </div>
      ) : view === 'results' ? (
        <Results rows={rows} />
      ) : view === 'board' ? (
        <Board rows={rows} onOpen={setOpenId} onMove={moveTo} />
      ) : (
        <List rows={rows} onOpen={setOpenId} />
      )}

      {openId && (
        <Detail id={openId} isAdmin={isAdmin} onClose={() => setOpenId(null)} onChanged={load} />
      )}
      {adding && <AddEnquiry clientId={clientId} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load() }} />}
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-pgm-line bg-white text-sm text-pgm-ink">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function TypeChip({ type }: { type: Type }) {
  return <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-pgm-cream text-pgm-green whitespace-nowrap">{typeLabel(type)}</span>
}

/** Kanban: one column per stage. Drag a card to move it, or open it and use the stage buttons. */
function Board({ rows, onOpen, onMove }: { rows: any[]; onOpen: (id: string) => void; onMove: (id: string, s: Status) => void }) {
  const [over, setOver] = useState<Status | null>(null)
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x">
      {STAGES.map((s) => {
        const cards = rows.filter((e) => e.status === s.value)
        return (
          <section key={s.value} aria-label={s.label}
            onDragOver={(e) => { e.preventDefault(); setOver(s.value) }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) onMove(id, s.value) }}
            className={`snap-start shrink-0 w-[78vw] sm:w-[260px] lg:flex-1 lg:min-w-[200px] rounded-xl border p-2.5 transition-colors ${over === s.value ? 'bg-[#E4EDE6] border-pgm-green/40' : 'bg-pgm-page border-pgm-line'}`}>
            <h2 className="flex items-center gap-2 px-1.5 pb-2.5 text-[13px] font-semibold text-pgm-ink">
              <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} aria-hidden />
              {s.label}
              <span className="ml-auto text-xs font-normal text-gray-400 tabular-nums">{cards.length}</span>
            </h2>
            <ul className="space-y-2 min-h-[60px]">
              {cards.map((e) => (
                <li key={e.id}>
                  <button type="button" draggable onDragStart={(ev) => ev.dataTransfer.setData('text/plain', e.id)} onClick={() => onOpen(e.id)}
                    className="w-full text-left bg-white border border-pgm-line rounded-lg px-3 py-2.5 hover:border-pgm-green/50 hover:shadow-sm transition cursor-grab active:cursor-grabbing">
                    <span className="block text-sm font-medium text-pgm-ink truncate">{e.name || e.email || e.phone || (e.anonymised ? 'Details removed' : 'No name given')}</span>
                    <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <TypeChip type={e.type} />
                      {e.status === 'BOOKED' && e.bookedValue ? <span className="text-[11px] font-semibold text-[#1E7A45]">{gbp(e.bookedValue)}</span> : null}
                    </span>
                    <span className="block text-[11.5px] text-gray-400 mt-1.5">{ago(e.receivedAt)} · {SOURCES[e.source] ?? e.source}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function List({ rows, onOpen }: { rows: any[]; onOpen: (id: string) => void }) {
  return (
    <div className="bg-white border border-pgm-line rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-pgm-cream text-left">
              {['Received', 'Name', 'Type', 'Contact', 'Source', 'Stage', 'Value'].map((h) => (
                <th key={h} className={`px-4 py-3 font-medium text-pgm-ink ${h === 'Value' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No enquiries match these filters</td></tr>}
            {rows.map((e) => (
              <tr key={e.id} onClick={() => onOpen(e.id)} className="border-t border-pgm-line/60 hover:bg-pgm-page cursor-pointer">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{day(e.receivedAt)}</td>
                <td className="px-4 py-3">
                  <button type="button" className="font-medium text-pgm-ink hover:text-pgm-green text-left" onClick={(ev) => { ev.stopPropagation(); onOpen(e.id) }}>
                    {e.name || (e.anonymised ? 'Details removed' : 'No name given')}
                  </button>
                </td>
                <td className="px-4 py-3"><TypeChip type={e.type} /></td>
                <td className="px-4 py-3 text-gray-600"><span className="block truncate max-w-[200px]">{e.email || '—'}</span><span className="block text-xs text-gray-400">{e.phone}</span></td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{SOURCES[e.source] ?? e.source}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <span className="w-2 h-2 rounded-full" style={{ background: STAGES.find((s) => s.value === e.status)!.dot }} aria-hidden />
                    {stageLabel(e.status, e.type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-pgm-ink">{e.status === 'BOOKED' && e.bookedValue ? gbp(e.bookedValue) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** One enquiry: contact details, what they asked, stage, value, notes and history. */
function Detail({ id, isAdmin, onClose, onChanged }: { id: string; isAdmin: boolean; onClose: () => void; onChanged: () => void }) {
  const [e, setE] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [value, setValue] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const fetchOne = useCallback(async () => {
    const res = await fetch(`/api/dashboard/enquiries/${id}`).then((r) => r.json())
    if (res.error) { setErr(res.error); return }
    setE(res.data); setNotes(res.data.staffNotes ?? ''); setValue(res.data.bookedValue != null ? String(res.data.bookedValue) : ''); setLostReason(res.data.lostReason ?? '')
  }, [id])
  useEffect(() => { fetchOne() }, [fetchOne])
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save(change: Record<string, unknown>, done?: string) {
    setErr(''); setMsg('')
    const res = await fetch(`/api/dashboard/enquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) }).then((r) => r.json())
    if (res.error) { setErr(res.error); return }
    if (done) setMsg(done)
    await fetchOne(); onChanged()
  }

  async function erase() {
    if (!window.confirm('Erase this person’s details?\n\nTheir name, email, phone, messages and notes will be removed from every enquiry they’ve made at this club. The enquiries stay as anonymous records so the figures don’t change. This can’t be undone.')) return
    const res = await fetch(`/api/dashboard/enquiries/${id}/erase`, { method: 'POST' }).then((r) => r.json())
    if (res.error) { setErr(res.error); return }
    setMsg(`Details erased from ${res.data.enquiries} ${res.data.enquiries === 1 ? 'enquiry' : 'enquiries'}.`)
    await fetchOne(); onChanged()
  }

  async function remove() {
    if (!window.confirm('Delete this enquiry permanently? This can’t be undone.')) return
    await fetch(`/api/dashboard/enquiries/${id}`, { method: 'DELETE' })
    onChanged(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Enquiry">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg h-full bg-white shadow-2xl overflow-y-auto">
        {!e ? (
          <div className="p-6 text-sm text-gray-400">{err || 'Loading…'}</div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <TypeChip type={e.type} />
                <h2 className="font-serif text-2xl text-pgm-ink font-semibold mt-2 break-words">{e.name || (e.anonymised ? 'Details removed' : 'No name given')}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Received {new Date(e.receivedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {SOURCES[e.source] ?? e.source}
                  {e.sourceDetail ? ` (${e.sourceDetail})` : ''}
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-pgm-ink p-1" aria-label="Close">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            {e.anonymised && (
              <p className="text-sm text-gray-600 bg-pgm-cream rounded-lg px-3 py-2.5">
                This person’s details have been removed. The enquiry is kept, without them, so the club’s figures stay the same.
              </p>
            )}

            {/* Contact */}
            <div className="flex flex-wrap gap-2">
              {e.phone && <a href={`tel:${e.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pgm-green text-white text-sm font-medium">Call {e.phone}</a>}
              {e.email && <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-pgm-line text-pgm-green text-sm font-medium break-all">Email {e.email}</a>}
            </div>
            <p className="text-xs text-gray-500 -mt-3">
              {e.marketingConsent ? '✓ Agreed to receive marketing emails' : 'Hasn’t agreed to marketing emails, so reply personally only.'}
            </p>

            {(e.message || e.eventDate || e.category) && (
              <div className="bg-pgm-page rounded-lg p-4 space-y-1.5">
                {e.category && <p className="text-xs text-gray-500">About: <span className="text-pgm-ink">{e.category}</span></p>}
                {e.eventDate && <p className="text-xs text-gray-500">Date mentioned: <span className="text-pgm-ink">{e.eventDate}</span></p>}
                {e.message && <p className="text-sm text-pgm-ink whitespace-pre-wrap">{e.message}</p>}
              </div>
            )}

            {/* Stage */}
            <div>
              <h3 className="text-sm font-semibold text-pgm-ink mb-2">Stage</h3>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => (
                  <button key={s.value} type="button" onClick={() => s.value !== e.status && save({ status: s.value })} aria-pressed={e.status === s.value}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] border transition-colors ${e.status === s.value ? 'bg-pgm-green text-white border-pgm-green' : 'bg-white text-gray-600 border-pgm-line hover:border-pgm-green/50'}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.status === s.value ? '#fff' : s.dot }} aria-hidden />
                    {stageLabel(s.value, e.type)}
                  </button>
                ))}
              </div>
              {e.status === 'BOOKED' && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="flex-1"><Input label={e.type === 'MEMBERSHIP' ? 'Membership value (£ a year)' : 'Booking value (£)'} inputMode="decimal" value={value} onChange={(ev) => setValue(ev.target.value.replace(/[^0-9.]/g, ''))} /></div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => save({ bookedValue: value }, '✓ Value saved')}>Save</Button>
                </div>
              )}
              {e.status === 'LOST' && (
                <div className="flex items-end gap-2 mt-3">
                  <div className="flex-1"><Input label="Why it didn’t go ahead (optional)" value={lostReason} maxLength={300} onChange={(ev) => setLostReason(ev.target.value)} /></div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => save({ lostReason }, '✓ Saved')}>Save</Button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="enq-type" className="text-sm font-semibold text-pgm-ink">Type</label>
              <select id="enq-type" value={e.type} onChange={(ev) => save({ type: ev.target.value })}
                className="mt-2 block w-full px-3 py-2 rounded-lg border border-pgm-line bg-white text-sm text-pgm-ink">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="enq-notes" className="text-sm font-semibold text-pgm-ink">Notes</label>
              <textarea id="enq-notes" value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={4} maxLength={5000}
                placeholder="Calls made, what they’re looking for, tour time…"
                className="mt-2 block w-full px-3 py-2 rounded-lg border border-pgm-line text-sm text-pgm-ink" />
              <div className="mt-2"><Button type="button" size="sm" variant="secondary" onClick={() => save({ staffNotes: notes }, '✓ Notes saved')} disabled={notes === (e.staffNotes ?? '')}>Save notes</Button></div>
            </div>

            {msg && <p className="text-sm text-pgm-green bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
            {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

            {(e.utmSource || e.utmCampaign) && (
              <p className="text-xs text-gray-500">Campaign: {[e.utmSource, e.utmMedium, e.utmCampaign].filter(Boolean).join(' · ')}</p>
            )}

            {/* History */}
            <div>
              <h3 className="text-sm font-semibold text-pgm-ink mb-3">History</h3>
              <ol className="relative border-l border-pgm-line ml-1.5 space-y-3">
                {(e.events ?? []).slice().reverse().map((ev: any) => (
                  <li key={ev.id} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-pgm-green" aria-hidden />
                    <p className="text-[13px] text-pgm-ink">{describe(ev, e.type)}</p>
                    <p className="text-[11.5px] text-gray-400">
                      {new Date(ev.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {ev.actorName ? ` · ${ev.actorName}` : ' · automatic'}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-4 border-t border-pgm-line">
                {!e.anonymised && (
                  <button type="button" onClick={erase} className="text-xs text-red-600 hover:underline">Erase this person’s details</button>
                )}
                <button type="button" onClick={remove} className="text-xs text-red-600 hover:underline">Delete this enquiry</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function describe(ev: any, type: Type): string {
  const st = (s: string) => stageLabel(s as Status, type)
  switch (ev.kind) {
    case 'created': return `Enquiry received${ev.detail ? ` (${SOURCES[ev.detail] ?? ev.detail})` : ''}`
    case 'stage': return `Moved from ${st(ev.fromValue)} to ${st(ev.toValue)}`
    case 'type': return `Type changed to ${typeLabel(ev.toValue)}`
    case 'value': return ev.toValue ? `Value set to ${gbp(Number(ev.toValue))}` : 'Value cleared'
    case 'note': return ev.detail ?? 'Notes updated'
    case 'mailchimp': return ev.detail ?? 'Sent to Mailchimp'
    case 'whatsapp': return ev.detail ?? 'WhatsApp alert sent'
    case 'anonymised': return ev.detail ?? 'Personal details removed'
    default: return ev.detail ?? ev.kind
  }
}

/** Add a phone, walk-in or email enquiry. */
function AddEnquiry({ clientId, onClose, onAdded }: { clientId: string; onClose: () => void; onAdded: () => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', type: 'MEMBERSHIP', source: 'phone', message: '' })
  const [err, setErr] = useState('')
  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const res = await fetch(`/api/dashboard/enquiries?clientId=${clientId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }).then((r) => r.json())
    if (res.error) { setErr(res.error); return }
    onAdded()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Add an enquiry">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div>
          <h2 className="font-serif text-xl font-semibold text-pgm-ink">Add an enquiry</h2>
          <p className="text-xs text-gray-500 mt-1">For enquiries by phone, email or in person. Website form enquiries arrive automatically.</p>
        </div>
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Input label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm font-medium text-pgm-ink">Type
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="mt-1.5 block w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-pgm-ink">How they got in touch
            <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className="mt-1.5 block w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm">
              {['phone', 'walk_in', 'email', 'manual'].map((s) => <option key={s} value={s}>{SOURCES[s]}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-pgm-ink">What they asked about
          <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} rows={3} maxLength={5000}
            className="mt-1.5 block w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </label>
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-pgm-ink">Cancel</button>
          <Button type="submit" disabled={!f.name && !f.email && !f.phone}>Add enquiry</Button>
        </div>
      </form>
    </div>
  )
}

/** What the enquiries led to: by where they came from, by type and by campaign, plus how quickly they were followed up. */
function Results({ rows }: { rows: any[] }) {
  const won = (r: any[]) => r.filter((e) => e.status === 'BOOKED')
  const value = (r: any[]) => won(r).reduce((s, e) => s + (e.bookedValue ?? 0), 0)
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

  // How far enquiries got. "Reached" counts anything that got to a stage, even if later lost.
  const steps = [
    { label: 'Received', n: rows.length },
    { label: 'Contacted', n: rows.filter((e) => e.reached >= 1).length },
    { label: 'Tour / viewing booked', n: rows.filter((e) => e.reached >= 2).length },
    { label: 'Joined / booked', n: rows.filter((e) => e.reached >= 3).length },
  ]
  const lost = rows.filter((e) => e.status === 'LOST').length

  // Time from arriving to first being moved on from New
  const waits = rows.filter((e) => e.firstMovedAt).map((e) => new Date(e.firstMovedAt).getTime() - new Date(e.receivedAt).getTime()).sort((a, b) => a - b)
  const median = waits.length ? waits[Math.floor(waits.length / 2)] : null
  const waiting = rows.filter((e) => e.status === 'NEW')
  const oldestWait = waiting.length ? Math.max(...waiting.map((e) => Date.now() - new Date(e.receivedAt).getTime())) : null

  const group = (key: (e: any) => string | null, label: (k: string) => string) => {
    const m = new Map<string, any[]>()
    for (const e of rows) { const k = key(e); if (k) m.set(k, [...(m.get(k) ?? []), e]) }
    return Array.from(m.entries()).map(([k, r]) => ({ key: k, label: label(k), total: r.length, won: won(r).length, value: value(r) }))
      .sort((a, b) => b.total - a.total)
  }
  const bySource = group((e) => e.source, (k) => SOURCES[k] ?? k)
  const byType = group((e) => e.type, (k) => typeLabel(k as Type))
  const byCampaign = group((e) => e.utmCampaign || null, (k) => k)
  const max = Math.max(1, rows.length)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white border border-pgm-line rounded-xl p-5 sm:p-6">
          <h2 className="font-serif text-xl text-pgm-ink font-semibold">How far enquiries got</h2>
          <p className="text-xs text-gray-500 mt-1">Each enquiry counts at every stage it reached, even if it was lost later.</p>
          <ol className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <li key={s.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-pgm-ink">{s.label}</span>
                  <span className="tabular-nums text-pgm-ink font-semibold">
                    {s.n}{i > 0 && <span className="text-gray-400 font-normal"> · {pct(s.n, rows.length)}</span>}
                  </span>
                </div>
                <div className="h-2 bg-pgm-cream rounded-full mt-1.5 overflow-hidden" aria-hidden>
                  <div className="h-full rounded-full" style={{ width: `${(s.n / max) * 100}%`, background: STAGES[i].dot }} />
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 mt-4">{lost} lost{value(rows) ? ` · ${gbp(value(rows))} won in value` : ''}</p>
        </section>

        <section className="bg-white border border-pgm-line rounded-xl p-5 sm:p-6">
          <h2 className="font-serif text-xl text-pgm-ink font-semibold">Speed of reply</h2>
          <p className="text-xs text-gray-500 mt-1">From an enquiry arriving to it being moved on from New.</p>
          <p className="text-[34px] leading-none font-semibold text-pgm-ink tabular-nums mt-5">{median === null ? '—' : duration(median)}</p>
          <p className="text-xs text-gray-500 mt-1.5">{median === null ? 'Shows once enquiries are followed up' : `typical time, across ${waits.length} ${waits.length === 1 ? 'enquiry' : 'enquiries'}`}</p>
          <div className="mt-5 pt-4 border-t border-pgm-line text-sm text-pgm-ink">
            {waiting.length
              ? <>{waiting.length} still New, the oldest waiting <strong>{duration(oldestWait!)}</strong>.</>
              : 'Nothing waiting for a first reply.'}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResultTable title="Where enquiries came from" rows={bySource} />
        <ResultTable title="What they were about" rows={byType} />
      </div>
      <ResultTable title="Campaigns" rows={byCampaign}
        empty="No enquiries carried a campaign tag. Links in emails and ads with utm_campaign show up here." />
    </div>
  )
}

function ResultTable({ title, rows, empty }: { title: string; rows: { key: string; label: string; total: number; won: number; value: number }[]; empty?: string }) {
  return (
    <section className="bg-white border border-pgm-line rounded-xl p-5 sm:p-6">
      <h2 className="font-serif text-xl text-pgm-ink font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-gray-500 mt-3">{empty ?? 'Nothing yet.'}</p> : (
        <div className="overflow-x-auto -mx-1 mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="font-medium py-2 px-1"><span className="sr-only">Name</span></th>
                <th className="font-medium py-2 px-1 text-right">Enquiries</th>
                <th className="font-medium py-2 px-1 text-right">Joined / booked</th>
                <th className="font-medium py-2 px-1 text-right">Rate</th>
                <th className="font-medium py-2 px-1 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pgm-line">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2.5 px-1 text-pgm-ink">{r.label}</td>
                  <td className="py-2.5 px-1 text-right tabular-nums">{r.total}</td>
                  <td className="py-2.5 px-1 text-right tabular-nums">{r.won}</td>
                  <td className="py-2.5 px-1 text-right tabular-nums text-gray-500">{r.total ? `${Math.round((r.won / r.total) * 100)}%` : '—'}</td>
                  <td className="py-2.5 px-1 text-right tabular-nums">{r.value ? gbp(r.value) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function duration(ms: number) {
  const h = ms / 3_600_000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`
  if (h < 48) return `${Math.round(h)} ${Math.round(h) === 1 ? 'hour' : 'hours'}`
  return `${Math.round(h / 24)} days`
}
