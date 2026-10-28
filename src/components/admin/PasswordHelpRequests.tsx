'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

/** "Forgot password" requests waiting for a new temporary password. */
export default function PasswordHelpRequests() {
  const [rows, setRows] = useState<any[]>([])
  const load = useCallback(() => {
    fetch('/api/admin/password-help').then((r) => r.json()).then((r) => setRows(r.data ?? [])).catch(() => {})
  }, [])
  useEffect(load, [load])

  async function done(id: string) {
    await fetch('/api/admin/password-help', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  if (rows.length === 0) return null
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-2">
      <h2 className="text-sm font-semibold text-amber-900">Password help requested</h2>
      <p className="text-xs text-amber-800">Set a new temporary password on the club’s settings page, send it to them, then mark the request done.</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 text-sm bg-white rounded-lg px-3 py-2">
            <span>
              <strong className="text-pgm-ink">{r.username}</strong>
              {r.client && <span className="text-gray-500"> · {r.client.name}</span>}
              <span className="text-gray-400"> · {new Date(r.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              {r.client && <Link href={`/admin/clients/${r.client.id}`} className="text-pgm-green hover:underline">Reset password</Link>}
              <button onClick={() => done(r.id)} className="text-gray-500 hover:text-pgm-ink hover:underline">Mark done</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
