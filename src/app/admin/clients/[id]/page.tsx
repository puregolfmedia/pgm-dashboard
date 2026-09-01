'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import DashboardHeader from '@/components/layout/DashboardHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()

  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    ga4PropertyId: '',
    ga4ServiceAccountJson: '',
    ga4BookingEventName: 'generate_lead',
    ga4MembershipEventName: 'membership_enquiry',
    metaAdAccountId: '',
    metaAccessToken: '',
    emailOctopusApiKey: '',
    mailchimpApiKey: '',
    mailchimpListId: '',
  })

  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`)
      .then((r) => r.json())
      .then((res) => {
        setClient(res.data)
        const cfg = res.data?.dataConfig
        if (cfg) {
          setForm({
            ga4PropertyId: cfg.ga4PropertyId ?? '',
            ga4ServiceAccountJson: '',
            ga4BookingEventName: cfg.ga4BookingEventName ?? 'generate_lead',
            ga4MembershipEventName: cfg.ga4MembershipEventName ?? 'membership_enquiry',
            metaAdAccountId: cfg.metaAdAccountId ?? '',
            metaAccessToken: '',
            emailOctopusApiKey: '',
            mailchimpApiKey: '',
            mailchimpListId: cfg.mailchimpListId ?? '',
          })
        }
        setLoading(false)
      })
  }, [id])

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setError(data.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault()
    if (!newPassword) return
    setResetting(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    const data = await res.json()
    setResetting(false)
    if (data.error) { setError(data.error); return }
    setNewPassword('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="px-8 py-8 text-sm text-gray-400">Loading…</div>
  if (!client) return <div className="px-8 py-8 text-sm text-red-500">Client not found</div>

  const cfg = client.dataConfig

  return (
    <>
      <DashboardHeader title={client.name} />
      <div className="px-8 py-8 max-w-2xl space-y-6">

        {/* GA4 config */}
        <form onSubmit={handleSave} className="bg-white border border-[#E8E8E8] rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Google Analytics 4</h2>
            <p className="text-xs text-gray-400">
              Status:{' '}
              {cfg?.ga4PropertyId
                ? <span className="text-pgm-green font-medium">✓ Connected</span>
                : <span className="text-gray-400">✗ Not configured</span>}
            </p>
          </div>

          <Input
            label="GA4 Property ID"
            hint="Found in GA4 → Admin → Property Settings (e.g. 123456789)"
            placeholder="123456789"
            value={form.ga4PropertyId}
            onChange={set('ga4PropertyId')}
          />

          <div>
            <label className="block text-sm font-medium text-pgm-ink mb-1.5">
              Service Account JSON
            </label>
            <p className="text-xs text-gray-400 mb-1.5">
              {cfg?.ga4ServiceAccountJson === '[configured]'
                ? '✓ Key stored — paste a new one below only if replacing it'
                : 'Paste the full JSON key from your GCP service account'}
            </p>
            <textarea
              rows={5}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm font-mono text-pgm-ink placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pgm-green/40 focus:border-pgm-green transition resize-none"
              placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
              value={form.ga4ServiceAccountJson}
              onChange={set('ga4ServiceAccountJson')}
            />
          </div>

          <Input
            label="Booking event name"
            hint="The GA4 event that counts as a booking start (default: generate_lead)"
            placeholder="generate_lead"
            value={form.ga4BookingEventName}
            onChange={set('ga4BookingEventName')}
          />
          <Input
            label="Membership enquiry event name"
            hint="The GA4 event that counts as a membership enquiry (default: membership_enquiry)"
            placeholder="membership_enquiry"
            value={form.ga4MembershipEventName}
            onChange={set('ga4MembershipEventName')}
          />

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Meta Ads</h2>
            <p className="text-xs text-gray-400 mb-4">
              Status:{' '}
              {cfg?.metaAdAccountId
                ? <span className="text-pgm-green font-medium">✓ Connected</span>
                : <span className="text-gray-400">✗ Not configured</span>}
            </p>
            <div className="space-y-4">
              <Input
                label="Ad Account ID"
                hint="Found in Meta Business Manager → Ad Accounts (numbers only, without 'act_')"
                placeholder="123456789012345"
                value={form.metaAdAccountId}
                onChange={set('metaAdAccountId')}
              />
              <Input
                label="System User Access Token"
                hint={cfg?.metaAccessToken === '[configured]'
                  ? '✓ Token stored — paste a new one only if replacing it'
                  : 'Long-lived token from Meta Business Manager → System Users'}
                type="password"
                placeholder={cfg?.metaAccessToken === '[configured]' ? '(unchanged)' : 'EAAxxxxxxx…'}
                value={form.metaAccessToken}
                onChange={set('metaAccessToken')}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Email Octopus</h2>
            <p className="text-xs text-gray-400 mb-4">
              Status:{' '}
              {cfg?.emailOctopusApiKey === '[configured]'
                ? <span className="text-pgm-green font-medium">✓ Connected</span>
                : <span className="text-gray-400">✗ Not configured</span>}
            </p>
            <Input
              label="API Key"
              hint={cfg?.emailOctopusApiKey === '[configured]'
                ? '✓ Key stored — paste a new one only if replacing it'
                : 'Found in Email Octopus → Account → API'}
              type="password"
              placeholder={cfg?.emailOctopusApiKey === '[configured]' ? '(unchanged)' : 'eo-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              value={form.emailOctopusApiKey}
              onChange={set('emailOctopusApiKey')}
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Mailchimp</h2>
            <p className="text-xs text-gray-400 mb-4">
              Status:{' '}
              {cfg?.mailchimpApiKey === '[configured]'
                ? <span className="text-pgm-green font-medium">✓ Connected</span>
                : <span className="text-gray-400">✗ Not configured</span>}
              {cfg?.mailchimpApiKey === '[configured]' && cfg?.emailOctopusApiKey === '[configured]' && (
                <span className="text-gray-400"> · takes priority over Email Octopus when both are set</span>
              )}
            </p>
            <div className="space-y-4">
              <Input
                label="API Key"
                hint={cfg?.mailchimpApiKey === '[configured]'
                  ? '✓ Key stored — paste a new one only if replacing it'
                  : "Account → Extras → API keys in Mailchimp. Keep the '-usXX' suffix, it's the datacenter."}
                type="password"
                placeholder={cfg?.mailchimpApiKey === '[configured]' ? '(unchanged)' : 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21'}
                value={form.mailchimpApiKey}
                onChange={set('mailchimpApiKey')}
              />
              <Input
                label="Audience (List) ID"
                hint="Audience → Settings → Audience name and defaults → Audience ID"
                placeholder="a1b2c3d4e5"
                value={form.mailchimpListId}
                onChange={set('mailchimpListId')}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {saved && <p className="text-sm text-pgm-green bg-green-50 rounded-lg px-3 py-2">✓ Saved successfully</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save config'}</Button>
            <Link href={`/admin/clients/${id}/view`}>
              <Button type="button" variant="secondary">View dashboard →</Button>
            </Link>
            <Link href="/admin" className="ml-auto">
              <Button type="button" variant="secondary">← Back</Button>
            </Link>
          </div>
        </form>

        {/* Password reset */}
        <form onSubmit={handlePasswordReset} className="bg-white border border-[#E8E8E8] rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Reset client password</h2>
            <p className="text-xs text-gray-400">Client will be prompted to change it on next login.</p>
          </div>
          <Input
            label="New temporary password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={resetting || !newPassword}>
            {resetting ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </div>
    </>
  )
}
