'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/generated/prisma/client'
import { OutreachStatus, TitleTier, IndustrySegment, CountryRegion } from '@/generated/prisma/enums'
import { UK_COUNTIES } from '@/lib/crm/location'

// Counties (real entries only — no section-header dividers)
const UK_COUNTY_NAMES = new Set(UK_COUNTIES.filter(c => !c.startsWith('—')))

// ── Labels & colours ──────────────────────────────────────────────────────────

const TIER_LABEL: Record<TitleTier, string> = {
  TIER_1: 'Director / GM',
  TIER_2: 'Head Pro / Manager',
  TIER_3: 'Marketing / Membership',
  OTHER: 'Other',
}
const TIER_COLOUR: Record<TitleTier, string> = {
  TIER_1: 'bg-pgm-green/15 text-pgm-green',
  TIER_2: 'bg-blue-100 text-blue-700',
  TIER_3: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<OutreachStatus, string> = {
  NOT_STARTED: 'Not contacted',
  MESSAGED: 'Messaged',
  NO_RESPONSE: 'No response',
  REPLIED: 'Replied',
  MEETING_BOOKED: 'Meeting booked',
  NOT_INTERESTED: 'Not interested',
}
const STATUS_COLOUR: Record<OutreachStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  MESSAGED: 'bg-blue-100 text-blue-700',
  NO_RESPONSE: 'bg-orange-100 text-orange-700',
  REPLIED: 'bg-pgm-green/15 text-pgm-green',
  MEETING_BOOKED: 'bg-emerald-100 text-emerald-700',
  NOT_INTERESTED: 'bg-red-100 text-red-600',
}
const SEGMENT_LABEL: Record<IndustrySegment, string> = {
  PRIVATE_MEMBERS_CLUB: 'Private Club',
  RESORT_GOLF: 'Resort',
  MUNICIPAL_PUBLIC: 'Municipal',
  GOLF_ACADEMY: 'Academy',
  GOLF_RETAIL: 'Retail',
  GOLF_MEDIA: 'Media',
  SUPPLIER_VENDOR: 'Supplier',
  ASSOCIATION: 'Association',
  UNKNOWN: '—',
}
const REGION_LABEL: Record<CountryRegion, string> = {
  UK: '🇬🇧 UK',
  IRELAND: '🇮🇪 Ireland',
  EUROPE: '🌍 Europe',
  NORTH_AMERICA: '🌎 N. America',
  AUSTRALIA_NZ: '🦘 Aus / NZ',
  ASIA: '🌏 Asia',
  REST_OF_WORLD: '🌐 Other',
  UNKNOWN: '— Unknown',
}
const REGION_OPTIONS: CountryRegion[] = [
  CountryRegion.UK,
  CountryRegion.IRELAND,
  CountryRegion.EUROPE,
  CountryRegion.NORTH_AMERICA,
  CountryRegion.AUSTRALIA_NZ,
  CountryRegion.ASIA,
  CountryRegion.REST_OF_WORLD,
  CountryRegion.UNKNOWN,
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'priority' | 'followup' | 'all'

type Props = {
  priorityQueue: Contact[]
  followUpQueue: Contact[]
  allContacts: Contact[]
  statusCounts: Record<string, number>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(date: Date | null | string): number | null {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

function fmtDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CrmDashboard({ priorityQueue, followUpQueue, allContacts, statusCounts }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('priority')

  const totalContacts = allContacts.length
  const notContactedTier1 = allContacts.filter(
    (c) => c.titleTier === TitleTier.TIER_1 && c.outreachStatus === OutreachStatus.NOT_STARTED
  ).length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-pgm-ink">LinkedIn CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalContacts.toLocaleString()} connections · {notContactedTier1} Directors/GMs not yet messaged
          </p>
        </div>
        <Link
          href="/crm/import"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-pgm-green hover:bg-pgm-green/90 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Import CSV
        </Link>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(STATUS_LABEL) as [OutreachStatus, string][]).map(([status, label]) => (
          <span
            key={status}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLOUR[status]}`}
          >
            {label} · {statusCounts[status] ?? 0}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          ['priority', `Message now (${priorityQueue.length})`],
          ['followup', `Follow up${followUpQueue.length > 0 ? ` · ${followUpQueue.length}` : ''}`],
          ['all', `All contacts (${totalContacts})`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-pgm-ink shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {t === 'followup' && followUpQueue.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                {followUpQueue.length > 99 ? '!' : followUpQueue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'priority' && (
        <PriorityQueue contacts={priorityQueue} onSelect={(id) => router.push(`/crm/${id}`)} onRefresh={() => router.refresh()} />
      )}
      {tab === 'followup' && (
        <FollowUpQueue contacts={followUpQueue} onSelect={(id) => router.push(`/crm/${id}`)} onRefresh={() => router.refresh()} />
      )}
      {tab === 'all' && (
        <AllContactsTable contacts={allContacts} onSelect={(id) => router.push(`/crm/${id}`)} onRefresh={() => router.refresh()} />
      )}
    </div>
  )
}

// ── Priority queue ────────────────────────────────────────────────────────────

function PriorityQueue({ contacts, onSelect, onRefresh }: { contacts: Contact[]; onSelect: (id: string) => void; onRefresh: () => void }) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<Set<string>>(new Set())

  const markMessaged = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setLoading(prev => new Set(prev).add(id))
    await fetch('/api/crm/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], outreachStatus: OutreachStatus.MESSAGED }),
    })
    setDone(prev => new Set(prev).add(id))
    setLoading(prev => { const s = new Set(prev); s.delete(id); return s })
    setTimeout(onRefresh, 600)
  }

  const visible = contacts.filter(c => !done.has(c.id))

  if (visible.length === 0 && contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
        No priority contacts — great work, or try importing more connections.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Top Directors &amp; GMs ranked by priority. Hit <strong>Messaged</strong> the moment you send — no need to open the contact.</p>
      {visible.map((c, i) => {
        const isLoading = loading.has(c.id)
        const region = (c as any).countryRegion as CountryRegion
        const county = (c as any).country as string | null
        const hasCounty = region === CountryRegion.UK && !!county
        return (
          <div
            key={c.id}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-pgm-green/30 transition-all flex items-center gap-3"
          >
            {/* Rank */}
            <div className="w-5 text-center text-xs font-semibold text-gray-300 shrink-0">{i + 1}</div>

            {/* Avatar — click to open detail */}
            <button onClick={() => onSelect(c.id)} className="w-9 h-9 rounded-full bg-pgm-green/10 flex items-center justify-center shrink-0 hover:bg-pgm-green/20 transition-colors">
              <span className="text-pgm-green text-xs font-semibold">{c.firstName[0]}{c.lastName[0]}</span>
            </button>

            {/* Info — click to open detail */}
            <button onClick={() => onSelect(c.id)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-pgm-ink text-sm">{c.firstName} {c.lastName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TIER_COLOUR[c.titleTier as TitleTier]}`}>
                  {TIER_LABEL[c.titleTier as TitleTier]}
                </span>
                {hasCounty && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-pgm-green/20 text-pgm-green">📍 {county}</span>}
                {region === CountryRegion.UK && !hasCounty && <span className="text-[11px] text-gray-400">🇬🇧</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                {c.position}{c.company ? ` · ${c.company}` : ''}
              </div>
            </button>

            {/* Score */}
            <span className="text-[11px] text-gray-400 shrink-0 hidden sm:block">Score {c.priorityScore}</span>

            {/* Quick action */}
            <button
              onClick={(e) => markMessaged(e, c.id)}
              disabled={isLoading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-pgm-green hover:bg-pgm-green/90 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {isLoading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
              )}
              Messaged
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Follow-up queue ───────────────────────────────────────────────────────────

function FollowUpQueue({ contacts, onSelect, onRefresh }: { contacts: Contact[]; onSelect: (id: string) => void; onRefresh: () => void }) {
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<Record<string, OutreachStatus>>({})

  const resolve = async (e: React.MouseEvent, id: string, status: OutreachStatus) => {
    e.stopPropagation()
    setLoading(prev => ({ ...prev, [id]: status }))
    await fetch('/api/crm/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], outreachStatus: status }),
    })
    setResolved(prev => new Set(prev).add(id))
    setLoading(prev => { const s = { ...prev }; delete s[id]; return s })
    setTimeout(onRefresh, 600)
  }

  const visible = contacts.filter(c => !resolved.has(c.id))

  if (visible.length === 0 && contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-2">
        <div className="text-2xl">✅</div>
        <p className="text-sm font-medium text-pgm-ink">No follow-ups overdue</p>
        <p className="text-xs text-gray-400">Anyone you've messaged but not heard back from in 7+ days will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">{visible.length} contact{visible.length !== 1 ? 's' : ''} waiting for a reply. Tap a button to resolve each one.</p>
      {visible.map((c) => {
        const days = daysSince(c.lastContactedAt as Date | null)
        const isLoading = !!loading[c.id]
        return (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gray-300 transition-all">
            {/* Avatar */}
            <button onClick={() => onSelect(c.id)} className="w-9 h-9 rounded-full bg-pgm-green/10 flex items-center justify-center shrink-0 hover:bg-pgm-green/20 transition-colors">
              <span className="text-pgm-green text-xs font-semibold">{c.firstName[0]}{c.lastName[0]}</span>
            </button>

            {/* Info */}
            <button onClick={() => onSelect(c.id)} className="flex-1 min-w-0 text-left">
              <div className="font-medium text-pgm-ink text-sm">{c.firstName} {c.lastName}</div>
              <div className="text-xs text-gray-500 truncate">{c.position}{c.company ? ` · ${c.company}` : ''}</div>
            </button>

            {/* Days badge */}
            {days !== null && (
              <span className={`text-xs font-semibold shrink-0 ${days > 30 ? 'text-red-500' : days > 14 ? 'text-orange-500' : 'text-amber-500'}`}>
                {days}d
              </span>
            )}

            {/* Inline resolve buttons */}
            <div className="flex gap-1.5 shrink-0">
              <button onClick={(e) => resolve(e, c.id, OutreachStatus.REPLIED)} disabled={isLoading}
                className="px-2.5 py-1.5 bg-pgm-green hover:bg-pgm-green/90 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
                Replied
              </button>
              <button onClick={(e) => resolve(e, c.id, OutreachStatus.NO_RESPONSE)} disabled={isLoading}
                className="px-2.5 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
                No reply
              </button>
              <button onClick={(e) => resolve(e, c.id, OutreachStatus.NOT_INTERESTED)} disabled={isLoading}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-medium rounded-lg transition-colors disabled:opacity-60">
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── All contacts table ────────────────────────────────────────────────────────

function AllContactsTable({ contacts, onSelect, onRefresh }: { contacts: Contact[]; onSelect: (id: string) => void; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterSegment, setFilterSegment] = useState<string>('ALL')
  const [filterRegion, setFilterRegion] = useState<string>('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<OutreachStatus>(OutreachStatus.MESSAGED)
  const [bulkMode, setBulkMode] = useState<'status' | 'location'>('status')
  // bulkLocationValue is either a UK county name (e.g. 'Essex') or a CountryRegion enum string
  const [bulkLocationValue, setBulkLocationValue] = useState<string>('Essex')

  const filtered = contacts.filter((c) => {
    if (filterTier !== 'ALL' && c.titleTier !== filterTier) return false
    if (filterStatus !== 'ALL' && c.outreachStatus !== filterStatus) return false
    if (filterSegment !== 'ALL' && c.industrySegment !== filterSegment) return false
    if (filterRegion !== 'ALL') {
      // If the filter value is a UK county name, match against the country field
      if (UK_COUNTY_NAMES.has(filterRegion)) {
        if ((c as any).country !== filterRegion) return false
      } else {
        if ((c as any).countryRegion !== filterRegion) return false
      }
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.position ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const toggle = useCallback((id: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s }), [])

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))

  const toggleAll = () =>
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(c => c.id)))

  const bulkUpdate = async () => {
    if (selected.size === 0) return
    setBulkLoading(true)
    const isCounty = UK_COUNTY_NAMES.has(bulkLocationValue)
    const payload = bulkMode === 'status'
      ? { ids: Array.from(selected), outreachStatus: bulkStatus }
      : isCounty
        ? { ids: Array.from(selected), countryRegion: CountryRegion.UK, country: bulkLocationValue }
        : { ids: Array.from(selected), countryRegion: bulkLocationValue }
    await fetch('/api/crm/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSelected(new Set())
    setBulkLoading(false)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name, company, title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
        />
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
        >
          <option value="ALL">All titles</option>
          {(Object.entries(TIER_LABEL) as [TitleTier, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
        >
          <option value="ALL">All statuses</option>
          {(Object.entries(STATUS_LABEL) as [OutreachStatus, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterSegment}
          onChange={(e) => setFilterSegment(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
        >
          <option value="ALL">All segments</option>
          {(Object.entries(SEGMENT_LABEL) as [IndustrySegment, string][]).filter(([k]) => k !== 'UNKNOWN').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
        >
          <option value="ALL">All locations</option>
          <option disabled>── UK counties ──</option>
          {UK_COUNTIES.map((c) =>
            c.startsWith('—') ? (
              <option key={c} disabled>{c}</option>
            ) : (
              <option key={c} value={c}>{c}</option>
            )
          )}
          <option disabled>── By region ──</option>
          {REGION_OPTIONS.map((k) => (
            <option key={k} value={k}>{REGION_LABEL[k]}</option>
          ))}
        </select>
        {filtered.length !== contacts.length && (
          <span className="px-3 py-2 text-xs text-gray-500 self-center">
            Showing {filtered.length.toLocaleString()} of {contacts.length.toLocaleString()}
          </span>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-pgm-ink text-white px-5 py-3 rounded-xl sticky top-4 z-10 shadow-lg flex-wrap">
          <span className="text-sm font-medium">{selected.size} selected</span>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-0.5 ml-2">
            {(['status', 'location'] as const).map((m) => (
              <button key={m} onClick={() => setBulkMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${bulkMode === m ? 'bg-white text-pgm-ink' : 'text-white/70 hover:text-white'}`}>
                {m === 'status' ? 'Set status' : 'Set location'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {bulkMode === 'status' ? (
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as OutreachStatus)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-pgm-ink focus:outline-none">
                {(Object.entries(STATUS_LABEL) as [OutreachStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <select value={bulkLocationValue} onChange={(e) => setBulkLocationValue(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-pgm-ink focus:outline-none max-w-[200px]">
                {UK_COUNTIES.map((c) =>
                  c.startsWith('—') ? (
                    <option key={c} disabled>{c}</option>
                  ) : (
                    <option key={c} value={c}>{c}</option>
                  )
                )}
                <option disabled>── Other regions ──</option>
                {REGION_OPTIONS.filter(r => r !== CountryRegion.UK && r !== CountryRegion.UNKNOWN).map((r) => (
                  <option key={r} value={r}>{REGION_LABEL[r]}</option>
                ))}
                <option value={CountryRegion.UNKNOWN}>— Unknown</option>
              </select>
            )}
            <button onClick={bulkUpdate} disabled={bulkLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-pgm-green hover:bg-pgm-green/80 transition-colors disabled:opacity-60">
              {bulkLoading ? 'Updating…' : 'Apply'}
            </button>
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-pgm-green focus:ring-pgm-green/30"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Segment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No contacts match your filters.</td>
                </tr>
              )}
              {filtered.map((c) => {
                const isSelected = selected.has(c.id)
                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${isSelected ? 'bg-pgm-green/5' : 'hover:bg-gray-50/60'}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggle(c.id) }}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-pgm-green focus:ring-pgm-green/30"
                        checked={isSelected}
                        onChange={() => toggle(c.id)}
                      />
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onSelect(c.id)}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-pgm-green/10 flex items-center justify-center shrink-0">
                          <span className="text-pgm-green text-[10px] font-semibold">{c.firstName[0]}{c.lastName[0]}</span>
                        </div>
                        <span className="font-medium text-pgm-ink">{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onSelect(c.id)}>
                      <div className="text-gray-700 truncate max-w-[180px]">{c.position ?? '—'}</div>
                      <span className={`mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TIER_COLOUR[c.titleTier as TitleTier]}`}>
                        {TIER_LABEL[c.titleTier as TitleTier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[160px] cursor-pointer" onClick={() => onSelect(c.id)}>{c.company ?? '—'}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onSelect(c.id)}>
                      {(c as any).countryRegion && (c as any).countryRegion !== 'UNKNOWN' ? (
                        (c as any).countryRegion === 'UK' && (c as any).country ? (
                          <span className="text-sm text-gray-700">🇬🇧 {(c as any).country}</span>
                        ) : (
                          <span className="text-sm">{REGION_LABEL[(c as any).countryRegion as CountryRegion]}</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs cursor-pointer" onClick={() => onSelect(c.id)}>{SEGMENT_LABEL[c.industrySegment as IndustrySegment]}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => onSelect(c.id)}>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOUR[c.outreachStatus as OutreachStatus]}`}>
                        {STATUS_LABEL[c.outreachStatus as OutreachStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer" onClick={() => onSelect(c.id)}>{c.priorityScore}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
