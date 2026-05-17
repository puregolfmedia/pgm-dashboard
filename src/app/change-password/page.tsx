'use client'

import { useState, FormEvent } from 'react'
import { signOut } from 'next-auth/react'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    // Sign out and back in so the JWT refreshes with passwordResetRequired: false
    await signOut({ callbackUrl: '/login?changed=1' })
  }

  return (
    <div className="min-h-screen bg-pgm-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pgm-green mb-4">
            <span className="text-white text-xl font-bold">PGM</span>
          </div>
          <h1 className="text-2xl font-semibold text-pgm-ink">Set your password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a new password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-pgm-ink mb-1.5">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-pgm-ink focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green text-sm transition"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-pgm-ink mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-pgm-ink focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green text-sm transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pgm-green hover:bg-pgm-green/90 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition"
          >
            {loading ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
