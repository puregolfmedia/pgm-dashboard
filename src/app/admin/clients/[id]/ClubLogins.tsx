'use client'

import { useCallback, useEffect, useState, FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const card = 'bg-white border border-pgm-line rounded-xl p-6 space-y-4'

/** One login per person at the club, with their name, so the enquiry history shows who did what. */
export default function ClubLogins({ clientId }: { clientId: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ displayName: '', username: '', password: '', mustChange: false })
  const [pw, setPw] = useState<{ id: string; password: string; mustChange: boolean } | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/admin/clients/${clientId}/users`).then((r) => r.json()).then((r) => setUsers(r.data ?? []))
  }, [clientId])
  useEffect(load, [load])

  const done = (text: string) => { setMsg(text); setError(''); load() }

  async function add(e: FormEvent) {
    e.preventDefault()
    setMsg(''); setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return }
    setForm({ displayName: '', username: '', password: '', mustChange: false })
    done(`✓ Login “${res.data.username}” added`)
  }

  async function setPassword(e: FormEvent) {
    e.preventDefault()
    if (!pw) return
    const res = await fetch(`/api/admin/users/${pw.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw.password, mustChange: pw.mustChange }),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return }
    setPw(null)
    done(pw.mustChange ? '✓ Password set. They’ll choose their own when they next sign in.' : '✓ Password set.')
  }

  async function remove(u: any) {
    if (!window.confirm(`Remove ${u.displayName || u.username}’s login? They won’t be able to sign in any more.`)) return
    await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    done('✓ Login removed')
  }

  return (
    <div className={card}>
      <div>
        <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Logins</h2>
        <p className="text-xs text-gray-400">
          Give each person at the club their own login. Their name appears against every change they make to an enquiry,
          and you can remove one person’s access without affecting anyone else.
        </p>
      </div>

      {users.length > 0 && (
        <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
          {users.map((u) => (
            <li key={u.id} className="px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span>
                  <span className="text-pgm-ink font-medium">{u.displayName || <em className="text-gray-400 not-italic">No name</em>}</span>
                  <span className="text-gray-400"> · {u.username}</span>
                  {u.displayName ? null : <span className="text-amber-700 text-xs"> · shared login</span>}
                  <span className="block text-xs text-gray-400">
                    {u.lastLoginAt ? `Last signed in ${new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Never signed in'}
                    {u.passwordResetRequired && ' · will choose a password at next sign-in'}
                  </span>
                </span>
                <span className="flex gap-3 shrink-0">
                  <button type="button" className="text-xs text-pgm-green hover:underline" onClick={() => setPw({ id: u.id, password: '', mustChange: false })}>Set password</button>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(u)}>Remove</button>
                </span>
              </div>
              {pw && pw.id === u.id && (() => { const editing = pw; return (
                <form onSubmit={setPassword} className="mt-3 space-y-3">
                  <Input label="New password" type="password" autoComplete="new-password" placeholder="At least 8 characters"
                    value={editing.password} onChange={(e) => setPw((p) => p && { ...p, password: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm text-pgm-ink">
                    <input type="checkbox" checked={editing.mustChange} onChange={(e) => setPw((p) => p && { ...p, mustChange: e.target.checked })} className="w-4 h-4 accent-pgm-green" />
                    Ask them to choose their own at next sign-in
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" variant="secondary" disabled={editing.password.length < 8}>Save password</Button>
                    <button type="button" className="text-sm text-gray-500 hover:text-pgm-ink px-2" onClick={() => setPw(null)}>Cancel</button>
                  </div>
                </form>
              ) })()}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
        <Input label="Person’s name" placeholder="Michael Smith" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <Input label="Username" placeholder="michael.hennerton" value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })} />
        <Input label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label className="sm:col-span-3 flex items-center gap-2 text-sm text-pgm-ink">
          <input type="checkbox" checked={form.mustChange} onChange={(e) => setForm({ ...form, mustChange: e.target.checked })} className="w-4 h-4 accent-pgm-green" />
          Ask them to choose their own password when they first sign in
        </label>
        <div className="sm:col-span-3">
          <Button type="submit" variant="secondary" disabled={!form.displayName || !form.username || form.password.length < 8}>Add login</Button>
        </div>
      </form>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-pgm-green bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  )
}
