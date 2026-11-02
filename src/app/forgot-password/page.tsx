'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/password-help', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }),
    }).then((r) => r.json()).catch(() => ({ ok: false, error: 'Something went wrong — please try again.' }))
    setLoading(false)
    if (!res.ok) { setError(res.error ?? 'Something went wrong — please try again.'); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-pgm-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pgm-green mb-4">
            <span className="text-white text-xl font-bold">PGM</span>
          </div>
          <h1 className="text-2xl font-semibold text-pgm-ink">Forgotten your password?</h1>
          <p className="text-sm text-gray-500 mt-1">We’ll set you up with a new temporary one.</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-3 text-center">
            <p className="text-sm text-pgm-ink font-medium">Request sent</p>
            <p className="text-sm text-gray-500">
              If that username exists, Pure Golf Media has been notified and will send you a new temporary password, usually within one working day.
            </p>
            <Link href="/login" className="inline-block text-sm text-pgm-green underline mt-2">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-pgm-ink mb-1.5">Username</label>
              <input id="username" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-pgm-ink focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green text-sm transition" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-pgm-green hover:bg-pgm-green/90 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition">
              {loading ? 'Sending…' : 'Request a new password'}
            </button>
            <p className="text-center text-xs text-gray-400"><Link href="/login" className="underline">Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}
