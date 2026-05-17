'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const passwordChanged = searchParams.get('changed') === '1'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Incorrect username or password.')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-pgm-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pgm-green mb-4">
            <span className="text-white text-xl font-bold">PGM</span>
          </div>
          <h1 className="text-2xl font-semibold text-pgm-ink">Pure Golf Media</h1>
          <p className="text-sm text-gray-500 mt-1">Client Performance Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-pgm-ink mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-pgm-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green text-sm transition"
              placeholder="your-username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-pgm-ink mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-pgm-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green text-sm transition"
              placeholder="••••••••"
            />
          </div>

          {passwordChanged && (
            <p className="text-sm text-pgm-green bg-green-50 border border-green-100 rounded-lg px-3.5 py-2.5">
              Password updated — please sign in with your new password.
            </p>
          )}

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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact Pure Golf Media if you need access.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
