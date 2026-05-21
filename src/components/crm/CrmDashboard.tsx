'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/generated/prisma/client'
import { OutreachStatus, TitleTier, IndustrySegment } from '@/generated/prisma/enums'

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
        <PriorityQueue contacts={priorityQueue} onSelect={(id) => router.push(`/crm/${id}`)} />
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

function PriorityQueue({ contacts, onSelect }: { contacts: Contact[]; onSelect: (id: string) => void }) {
  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
        No priority contacts — great work, or try importing more connections.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Top Directors &amp; GMs you haven't contacted yet, ranked by priority score.</p>
      {contacts.map((c, i) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-pgm-green/40 hover:shadow-sm transition-all flex items-center gap-4"
        >
          <div className="w-6 text-center text-xs font-semibold text-gray-400 shrink-0">{i + 1}</div>
          <div className="w-9 h-9 rounded-full bg-pgm-green/10 flex items-center justify-center shrink-0">
            <span className="text-pgm-green text-xs font-semibold">{c.firstName[0]}{c.lastName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-pgm-ink text-sm">{c.firstName} {c.lastName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TIER_COLOUR[c.titleTier as TitleTier]}`}>
                {TIER_LABEL[c.titleTier as TitleTier]}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {c.position}{c.company ? ` · ${c.company}` : ''}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium block ${STATUS_COLOUR[c.outreachStatus as OutreachStatus]}`}>
              {STATUS_LABEL[c.outreachStatus as OutreachStatus]}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Score {c.priorityScore}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Follow-up queue ───────────────────────────────────────────────────────────

function FollowUpQueue({ contacts, onSelect, onRefresh }: { contacts: Contact[]; onSelect: (id: string) => void; onRefresh: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const toggle = (id: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const bulkUpdate = async (status: OutreachStatus) => {
    if (selected.size === 0) return
    setBulkLoading(true)
    await fetch('/api/crm/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), outreachStatus: status }),
    })
    setSelected(new Set())
    setBulkLoading(false)
    onRefresh()
  }

  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-2">
        <div className="text-2xl">✅</div>
        <p className="text-sm font-medium text-pgm-ink">No follow-ups overdue</p>
        <p className="text-xs text-gray-400">Anyone you've messaged but not heard back from in 7+ days will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        {contacts.length} contact{contacts.length !== 1 ? 's' : ''} messaged 7+ days ago with no reply. Select any to bulk update their status.
      </p>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-pgm-ink text-white px-5 py-3 rounded-xl sticky top-4 z-10 shadow-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            {([
              [OutreachStatus.NO_RESPONSE, 'Mark no response', 'bg-orange-500 hover:bg-orange-600'],
              [OutreachStatus.REPLIED, 'Mark replied', 'bg-pgm-green hover:bg-pgm-green/80'],
              [OutreachStatus.NOT_INTERESTED, 'Not interested', 'bg-red-500 hover:bg-red-600'],
            ] as [OutreachStatus, string, string][]).map(([status, label, cls]) => (
              <button
                key={status}
                onClick={() => bulkUpdate(status)}
                disabled={bulkLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${cls}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-pgm-green focus:ring-pgm-green/30"
                  checked={selected.size === contacts.length && contacts.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? new Set(contacts.map(c => c.id)) : new Set())}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last messaged</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days waiting</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contacts.map((c) => {
              const days = daysSince(c.lastContactedAt as Date | null)
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
                  <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/crm/${c.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-pgm-green/10 flex items-center justify-center shrink-0">
                        <span className="text-pgm-green text-[10px] font-semibold">{c.firstName[0]}{c.lastName[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium text-pgm-ink">{c.firstName} {c.lastName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">{c.position ?? ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => window.location.href = `/crm/${c.id}`}>
                    <div className="truncate max-w-[160px]">{c.company ?? '—'}</div>
                    <div className="text-xs text-gray-400">{SEGMENT_LABEL[c.industrySegment as IndustrySegment]}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.lastContactedAt as Date | null)}</td>
                  <td className="px-4 py-3">
                    {days !== null ? (
                      <span className={`text-sm font-semibold ${days > 30 ? 'text-red-600' : days > 14 ? 'text-orange-600' : 'text-amber-600'}`}>
                        {days}d
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOUR[c.outreachStatus as OutreachStatus]}`}>
                      {STATUS_LABEL[c.outreachStatus as OutreachStatus]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── All contacts table ────────────────────────────────────────────────────────

function AllContactsTable({ contacts, onSelect, onRefresh }: { contacts: Contact[]; onSelect: (id: string) => void; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterSegment, setFilterSegment] = useState<string>('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<OutreachStatus>(OutreachStatus.MESSAGED)

  const filtered = contacts.filter((c) => {
    if (filterTier !== 'ALL' && c.titleTier !== filterTier) return false
    if (filterStatus !== 'ALL' && c.outreachStatus !== filterStatus) return false
    if (filterSegment !== 'ALL' && c.industrySegment !== filterSegment) return false
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
    await fetch('/api/crm/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), outreachStatus: bulkStatus }),
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
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-xs text-white/60">Mark all as:</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OutreachStatus)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-pgm-ink focus:outline-none"
            >
              {(Object.entries(STATUS_LABEL) as [OutreachStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={bulkUpdate}
              disabled={bulkLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-pgm-green hover:bg-pgm-green/80 transition-colors disabled:opacity-60"
            >
              {bulkLoading ? 'Updating…' : 'Apply'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Segment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No contacts match your filters.</td>
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
