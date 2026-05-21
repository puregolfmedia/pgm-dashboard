'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Contact, ContactNote, OutreachLog } from '@/generated/prisma/client'
import { OutreachStatus, OutreachType, TitleTier, IndustrySegment } from '@/generated/prisma/enums'

type FullContact = Contact & { notes: ContactNote[]; outreachLogs: OutreachLog[] }

const TIER_LABEL: Record<TitleTier, string> = {
  TIER_1: 'Director / GM',
  TIER_2: 'Head Pro / Manager',
  TIER_3: 'Marketing / Membership',
  OTHER: 'Other',
}
const STATUS_LABEL: Record<OutreachStatus, string> = {
  NOT_STARTED: 'Not contacted',
  MESSAGED: 'Messaged',
  NO_RESPONSE: 'No response',
  REPLIED: 'Replied',
  MEETING_BOOKED: 'Meeting booked',
  NOT_INTERESTED: 'Not interested',
}
const OUTREACH_TYPE_LABEL: Record<OutreachType, string> = {
  LINKEDIN_MESSAGE: 'LinkedIn message',
  EMAIL: 'Email',
  CALL: 'Call',
  MEETING: 'Meeting',
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
  UNKNOWN: 'Unknown',
}

export default function ContactDetail({ contact }: { contact: FullContact }) {
  const router = useRouter()
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [outreachType, setOutreachType] = useState<OutreachType>(OutreachType.LINKEDIN_MESSAGE)
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus>(OutreachStatus.MESSAGED)
  const [outreachNotes, setOutreachNotes] = useState('')
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(contact.outreachStatus)

  const addNote = async () => {
    if (!noteText.trim()) return
    setNoteLoading(true)
    await fetch(`/api/crm/contacts/${contact.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteText }),
    })
    setNoteText('')
    setNoteLoading(false)
    router.refresh()
  }

  const logOutreach = async () => {
    setOutreachLoading(true)
    await fetch(`/api/crm/contacts/${contact.id}/outreach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: outreachType, notes: outreachNotes, outreachStatus }),
    })
    setOutreachNotes('')
    setCurrentStatus(outreachStatus)
    setOutreachLoading(false)
    router.refresh()
  }

  const updateStatus = async (newStatus: OutreachStatus) => {
    setStatusLoading(true)
    await fetch(`/api/crm/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreachStatus: newStatus }),
    })
    setCurrentStatus(newStatus)
    setStatusLoading(false)
    router.refresh()
  }

  const fmtDate = (d: Date | string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/crm" className="text-sm text-gray-500 hover:text-pgm-ink transition-colors">
        ← Back to contacts
      </Link>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-start gap-5">
        <div className="w-14 h-14 rounded-full bg-pgm-green/10 flex items-center justify-center shrink-0">
          <span className="text-pgm-green text-lg font-semibold">{contact.firstName[0]}{contact.lastName[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-pgm-ink">{contact.firstName} {contact.lastName}</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pgm-green/15 text-pgm-green">
              {TIER_LABEL[contact.titleTier]}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Score {contact.priorityScore}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{contact.position ?? '—'}</p>
          <p className="text-sm text-gray-500">{contact.company ?? '—'} · {SEGMENT_LABEL[contact.industrySegment]}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-pgm-green transition-colors">
                LinkedIn profile
              </a>
            )}
            {contact.email && <span>{contact.email}</span>}
            <span>Connected {fmtDate(contact.connectedOn)}</span>
            {contact.lastContactedAt && <span>Last contact {fmtDate(contact.lastContactedAt)}</span>}
          </div>
        </div>
        {/* Quick status */}
        <div className="shrink-0">
          <select
            value={currentStatus}
            onChange={(e) => updateStatus(e.target.value as OutreachStatus)}
            disabled={statusLoading}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30 disabled:opacity-60"
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log outreach */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-pgm-ink">Log outreach</h2>
          <div className="flex gap-2">
            <select
              value={outreachType}
              onChange={(e) => setOutreachType(e.target.value as OutreachType)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
            >
              {Object.entries(OUTREACH_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={outreachStatus}
              onChange={(e) => setOutreachStatus(e.target.value as OutreachStatus)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea
            value={outreachNotes}
            onChange={(e) => setOutreachNotes(e.target.value)}
            placeholder="Notes (optional)…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
          />
          <button
            onClick={logOutreach}
            disabled={outreachLoading}
            className="w-full px-4 py-2.5 bg-pgm-green hover:bg-pgm-green/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {outreachLoading ? 'Saving…' : 'Log outreach'}
          </button>

          {/* Outreach history */}
          {contact.outreachLogs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {contact.outreachLogs.map((log) => (
                <div key={log.id} className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{OUTREACH_TYPE_LABEL[log.type]}</span>
                  {' · '}{fmtDate(log.sentAt)}
                  {log.notes && <p className="text-gray-400 mt-0.5">{log.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-pgm-ink">Notes</h2>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pgm-green/30"
          />
          <button
            onClick={addNote}
            disabled={noteLoading || !noteText.trim()}
            className="px-4 py-2 bg-pgm-green hover:bg-pgm-green/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {noteLoading ? 'Saving…' : 'Add note'}
          </button>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            {contact.notes.length === 0 && <p className="text-xs text-gray-400">No notes yet.</p>}
            {contact.notes.map((note) => (
              <div key={note.id} className="text-sm">
                <p className="text-gray-700">{note.body}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(note.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
