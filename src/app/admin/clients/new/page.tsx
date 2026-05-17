'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/layout/DashboardHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', username: '', password: '' })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setError(data.error); return }
    router.push('/admin')
    router.refresh()
  }

  return (
    <>
      <DashboardHeader title="New Client" />
      <div className="px-8 py-8 max-w-lg">
        <form onSubmit={handleSubmit} className="bg-white border border-[#E8E8E8] rounded-2xl p-6 space-y-5">
          <Input
            label="Club name"
            placeholder="Colne Valley Golf Club"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value
              setForm((f) => ({ ...f, name, slug: autoSlug(name) }))
            }}
            required
          />
          <Input
            label="Slug"
            hint="URL-safe identifier — auto-filled from club name"
            placeholder="colne-valley-golf-club"
            value={form.slug}
            onChange={set('slug')}
            required
          />
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Login credentials</p>
            <div className="space-y-4">
              <Input
                label="Username"
                placeholder="colne-valley"
                value={form.username}
                onChange={set('username')}
                required
              />
              <Input
                label="Temporary password"
                type="password"
                hint="Client will be prompted to change this on first login"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create client'}</Button>
            <Link href="/admin">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}
