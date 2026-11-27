'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import type { EnquiryForm, FormField } from '@/lib/enquiryForms'

const input = 'w-full rounded-lg border border-[#CBD3CD] bg-white px-3.5 py-2.5 text-[15px] text-pgm-ink placeholder:text-gray-400 ' +
  'focus:outline-none focus:border-[var(--club)] focus:shadow-[0_0_0_3px_rgba(20,32,25,0.12)] aria-[invalid=true]:border-[#B4432F]'

export default function EnquiryFormView({ clubSlug, clubName, form, consentText, privacyUrl }: {
  clubSlug: string; clubName: string; form: EnquiryForm; consentText: string; privacyUrl: string | null
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<{ text: string; field?: string } | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [back, setBack] = useState<{ href: string; host: string } | null>(null)
  const started = useRef(0)
  const utm = useRef<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    started.current = Date.now()
    const q = new URLSearchParams(window.location.search)
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) { const v = q.get(k); if (v) utm.current[k] = v }
    // Someone arriving from the club's website can go straight back to it afterwards
    try {
      const ref = document.referrer ? new URL(document.referrer) : null
      if (ref && ref.origin !== window.location.origin) setBack({ href: ref.href, host: ref.hostname.replace(/^www\./, '') })
    } catch { /* no referrer */ }
  }, [])

  const set = (name: string) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [name]: e.target.value }))
    if (error?.field === name) setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSending(true); setError(null)
    try {
      const res = await fetch(`/api/enquire/${encodeURIComponent(clubSlug)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values, ...utm.current, form: form.slug, marketing_consent: consent, _t: started.current,
          _honey: (formRef.current?.elements.namedItem('company_website') as HTMLInputElement | null)?.value ?? '',
        }),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok || !r.ok) {
        setError({ text: r.error || 'Your enquiry didn’t send. Check your connection and try again.', field: r.field })
        if (r.field) (formRef.current?.elements.namedItem(r.field) as HTMLElement | null)?.focus()
        return
      }
      setSentTo((values.name || '').trim().split(/\s+/)[0] || 'you')
      window.scrollTo({ top: 0 })
    } catch {
      setError({ text: 'Your enquiry didn’t send. Check your connection and try again.' })
    } finally {
      setSending(false)
    }
  }

  if (sentTo) {
    return (
      <div className="mt-8 bg-white border border-pgm-line rounded-2xl p-6 sm:p-8" role="status">
        <span className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--club)' }} aria-hidden>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h2 className="font-serif text-2xl text-pgm-ink mt-4">Thanks, {sentTo}.</h2>
        <p className="text-[15px] text-gray-600 mt-2 leading-relaxed">
          Your enquiry has reached the team at {clubName}. They’ll be in touch soon.
        </p>
        {back && (
          <a href={back.href} className="inline-block mt-6 text-[15px] font-medium underline underline-offset-4" style={{ color: 'var(--club)' }}>
            Back to {back.host}
          </a>
        )}
      </div>
    )
  }

  const field = (f: FormField) => {
    const props = {
      id: f.name, name: f.name, required: f.required, value: values[f.name] ?? '', onChange: set(f.name),
      'aria-invalid': error?.field === f.name ? true : undefined, className: input,
    }
    return (
      <div key={f.name}>
        <label htmlFor={f.name} className="block text-sm font-medium text-pgm-ink mb-1.5">{f.label}</label>
        {f.kind === 'textarea' ? <textarea {...props} rows={4} maxLength={4000} className={`${input} resize-y`} />
          : f.kind === 'select' ? (
            <select {...props}>
              <option value="">Choose…</option>
              {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : <input {...props} type={f.kind} {...(f.kind === 'number' && { min: 1, max: 2000, inputMode: 'numeric' as const })} />}
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate={false} className="mt-8 bg-white border border-pgm-line rounded-2xl p-5 sm:p-7 space-y-5">
      {field({ name: 'name', label: 'Your name', kind: 'text', required: true, placeholder: '' })}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-pgm-ink mb-1.5">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" value={values.email ?? ''} onChange={set('email')}
            aria-invalid={error?.field === 'email' || undefined} className={input} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-pgm-ink mb-1.5">
            Phone <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" value={values.phone ?? ''} onChange={set('phone')}
            aria-invalid={error?.field === 'phone' || undefined} className={input} />
        </div>
      </div>

      {form.fields.map(field)}

      {/* Spam trap: hidden from people, filled in by bots */}
      <div aria-hidden className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="company_website">Leave this empty</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex gap-3 items-start rounded-lg bg-[#F4F6F3] px-3.5 py-3 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--club)]" />
        <span className="text-sm text-pgm-ink leading-snug">{consentText}</span>
      </label>

      {error && <p className="text-sm text-[#B4432F] bg-[#FBEFEC] rounded-lg px-3.5 py-2.5" role="alert">{error.text}</p>}

      <button type="submit" disabled={sending}
        className="w-full sm:w-auto rounded-lg px-6 py-3 text-[15px] font-semibold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--club)]"
        style={{ background: 'var(--club)' }}>
        {sending ? 'Sending…' : 'Send enquiry'}
      </button>

      <p className="text-xs text-gray-500 leading-relaxed">
        {clubName} will use your details to reply to this enquiry.
        {privacyUrl && <> Read the club’s <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">privacy policy</a>.</>}
      </p>
    </form>
  )
}
