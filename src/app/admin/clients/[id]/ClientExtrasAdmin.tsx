'use client'

import { useCallback, useEffect, useState, FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { GoalProgress } from '@/lib/goals'

const card = 'bg-white border border-pgm-line rounded-xl p-6 space-y-4'
const today = () => new Date().toISOString().slice(0, 10)
const METRIC_LABEL = { ENQUIRIES: 'Enquiries received', BOOKINGS: 'Bookings (count)', REVENUE: 'Booked revenue (£)' }

/** Admin sections for the website-form address, goals and "what we did" notes. */
export default function ClientExtrasAdmin({ clientId, intakeToken }: { clientId: string; intakeToken: string | null }) {
  return (
    <>
      <MembershipSection clientId={clientId} />
      <IntakeSection clientId={clientId} initialToken={intakeToken} />
      <GoalsSection clientId={clientId} />
      <NotesSection clientId={clientId} />
    </>
  )
}

function IntakeSection({ clientId, initialToken }: { clientId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const url = token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/intake/${token}` : null

  async function generate() {
    if (token && !window.confirm('Replace the form address? Any form still using the old one will stop sending enquiries until you update it.')) return
    setBusy(true)
    const res = await fetch(`/api/admin/clients/${clientId}/intake`, { method: 'POST' }).then((r) => r.json())
    setBusy(false)
    if (res.data?.intakeToken) setToken(res.data.intakeToken)
  }

  return (
    <div className={card}>
      <div>
        <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Website form → Enquiries</h2>
        <p className="text-xs text-gray-400">
          Website forms can send each enquiry straight into the club’s Enquiries tab. Point the form at the address below.
        </p>
      </div>
      {url ? (
        <>
          <div className="flex gap-2">
            <input readOnly value={url} aria-label="Form address"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono text-pgm-ink bg-gray-50" />
            <Button type="button" variant="secondary" size="sm"
              onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="text-xs text-gray-500 space-y-1.5">
            <p><strong className="text-pgm-ink">FormSubmit:</strong> add a hidden field to the form:{' '}
              <code className="bg-gray-100 px-1 rounded break-all">{`<input type="hidden" name="_webhook" value="${url}?category=Christmas%20party">`}</code>
            </p>
            <p><strong className="text-pgm-ink">Other form tools:</strong> paste the address into the tool’s “webhook” setting.</p>
            <p>Add <code className="bg-gray-100 px-1 rounded">?category=…</code> to the end to label which form it came from (e.g. Christmas party, Wedding). Submit one test enquiry and check it appears.</p>
            <p className="text-gray-400">Keep this address private — anyone who has it can add enquiries.</p>
          </div>
          <button type="button" onClick={generate} disabled={busy} className="text-xs text-gray-400 hover:text-red-600 underline">
            Replace address (if it has leaked)
          </button>
        </>
      ) : (
        <Button type="button" onClick={generate} disabled={busy}>{busy ? 'Creating…' : 'Create form address'}</Button>
      )}
    </div>
  )
}

function GoalsSection({ clientId }: { clientId: string }) {
  const [goals, setGoals] = useState<GoalProgress[]>([])
  const [form, setForm] = useState({ name: '', metric: 'BOOKINGS', category: '', target: '', startDate: today(), deadline: '' })
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/dashboard/goals?clientId=${clientId}`).then((r) => r.json()).then((r) => setGoals(r.data ?? []))
  }, [clientId])
  useEffect(load, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/goals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return }
    setForm({ ...form, name: '', target: '', deadline: '' })
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this goal?')) return
    await fetch(`/api/admin/goals/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <form onSubmit={add} className={card}>
      <div>
        <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Goals</h2>
        <p className="text-xs text-gray-400">Targets shown as progress bars on the club’s Overview and Enquiries tabs. Progress is counted from enquiries.</p>
      </div>
      {goals.length > 0 && (
        <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                <span className="text-pgm-ink font-medium">{g.name}</span>
                <span className="text-gray-400"> · {METRIC_LABEL[g.metric]} {g.metric === 'REVENUE' ? `£${g.target}` : g.target}
                  {g.category ? ` · ${g.category}` : ''} · by {new Date(g.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </span>
              <button type="button" onClick={() => remove(g.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Goal name" placeholder="Christmas parties booked" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div>
          <label className="block text-sm font-medium text-pgm-ink mb-1.5">What to count</label>
          <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-pgm-ink bg-white">
            {Object.entries(METRIC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Input label="Target" inputMode="decimal" placeholder={form.metric === 'REVENUE' ? '10000' : '25'} value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value.replace(/[^0-9.]/g, '') })} />
        <Input label="Only enquiries of type (optional)" placeholder="Christmas party" value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Input label="Start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <Button type="submit" variant="secondary">Add goal</Button>
    </form>
  )
}

function NotesSection({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<any[]>([])
  const [form, setForm] = useState({ date: today(), text: '' })
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/admin/clients/${clientId}/notes`).then((r) => r.json()).then((r) => setNotes(r.data ?? []))
  }, [clientId])
  useEffect(load, [load])

  async function add(e: FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return }
    setForm({ ...form, text: '' })
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/admin/notes/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <form onSubmit={add} className={card}>
      <div>
        <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">What we did (chart notes)</h2>
        <p className="text-xs text-gray-400">Each note appears as a marker on the club’s daily chart, so results can be seen next to the work that caused them.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input label="What was done" placeholder="Christmas party page live" maxLength={140} value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <Button type="submit" variant="secondary">Add note</Button>
      {notes.length > 0 && (
        <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="text-gray-400 tabular-nums">{new Date(n.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {'  '}<span className="text-pgm-ink">{n.text}</span>
              </span>
              <button type="button" onClick={() => remove(n.id)} className="text-xs text-red-600 hover:underline shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}

const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

/** The membership value target, and one figure per month to track progress against it. */
function MembershipSection({ clientId }: { clientId: string }) {
  const [goal, setGoal] = useState({ baseline: '', target: '', targetDate: '' })
  const [values, setValues] = useState<any[]>([])
  const [entry, setEntry] = useState({ date: today().slice(0, 8) + '01', value: '', members: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/admin/clients/${clientId}/membership`).then((r) => r.json()).then((r) => {
      const g = r.data?.goal
      if (g) setGoal({
        baseline: g.membershipBaseline != null ? String(g.membershipBaseline) : '',
        target: g.membershipTarget != null ? String(g.membershipTarget) : '',
        targetDate: g.membershipTargetDate ? String(g.membershipTargetDate).slice(0, 10) : '',
      })
      setValues(r.data?.values ?? [])
    })
  }, [clientId])
  useEffect(load, [load])

  async function saveGoal() {
    setError(''); setMsg('')
    const res = await fetch(`/api/admin/clients/${clientId}/membership`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return }
    setMsg('✓ Target saved')
  }

  async function addEntry(e: FormEvent) {
    e.preventDefault()
    setError(''); setMsg('')
    const res = await fetch(`/api/admin/clients/${clientId}/membership`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return }
    setEntry({ ...entry, value: '', members: '' })
    setMsg('✓ Figure added')
    load()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this figure?')) return
    await fetch(`/api/admin/membership/${id}`, { method: 'DELETE' })
    load()
  }

  const money = (v: string) => v.replace(/[^0-9.]/g, '')

  return (
    <form onSubmit={addEntry} className={card}>
      <div>
        <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Membership value</h2>
        <p className="text-xs text-gray-400">
          Shown in the Membership section of the club’s dashboard: progress from the starting value to the target. Add the total
          yearly membership value once a month (ask the club for it, e.g. from BRS), with the number of members if you have it.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Starting value (£)" inputMode="decimal" placeholder="348000" value={goal.baseline}
          onChange={(e) => setGoal({ ...goal, baseline: money(e.target.value) })} />
        <Input label="Target value (£)" inputMode="decimal" placeholder="500000" value={goal.target}
          onChange={(e) => setGoal({ ...goal, target: money(e.target.value) })} />
        <Input label="Target date" type="date" value={goal.targetDate} onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })} />
      </div>
      <Button type="button" variant="secondary" onClick={saveGoal}>Save target</Button>

      <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Month" type="date" hint="Use the 1st of the month" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
        <Input label="Total membership value (£)" inputMode="decimal" placeholder="361500" value={entry.value}
          onChange={(e) => setEntry({ ...entry, value: money(e.target.value) })} />
        <Input label="Members (optional)" inputMode="numeric" placeholder="426" value={entry.members}
          onChange={(e) => setEntry({ ...entry, members: e.target.value.replace(/[^0-9]/g, '') })} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-pgm-green bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
      <Button type="submit" variant="secondary" disabled={!entry.value || !entry.date}>Add figure</Button>
      {values.length > 0 && (
        <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
          {values.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="text-gray-400 tabular-nums">{new Date(v.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                {'  '}<span className="text-pgm-ink font-medium tabular-nums">{gbp(v.value)}</span>
                {v.members != null && <span className="text-gray-400"> · {v.members} members</span>}
              </span>
              <button type="button" onClick={() => remove(v.id)} className="text-xs text-red-600 hover:underline shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
