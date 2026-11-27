'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ENQUIRY_FORMS } from '@/lib/enquiryForms'

const card = 'bg-white border border-pgm-line rounded-xl p-6 space-y-4'

/** Turn a club's hosted enquiry forms on, choose which it offers, and copy their links for the club's website. */
export default function EnquiryForms({ clientId }: { clientId: string }) {
  const [slug, setSlug] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [types, setTypes] = useState<string[]>(ENQUIRY_FORMS.map((f) => f.type))
  const [privacy, setPrivacy] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch(`/api/admin/clients/${clientId}/crm`).then((r) => r.json()).then((r) => {
      setSlug(r.data?.slug ?? '')
      const s = r.data?.settings
      if (s) { setEnabled(s.enabled); setTypes(s.formTypes); setPrivacy(s.privacyPolicyUrl ?? '') }
      setLoaded(true)
    })
  }, [clientId])

  async function save(patch: Record<string, unknown>, text: string) {
    setMsg(''); setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/crm`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    }).then((r) => r.json())
    if (res.error) { setError(res.error); return false }
    setEnabled(res.data.enabled); setTypes(res.data.formTypes); setPrivacy(res.data.privacyPolicyUrl ?? '')
    setMsg(text)
    return true
  }

  const toggleType = (t: string) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t]
    save({ formTypes: next }, '✓ Forms updated')
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(''), 1500)
  }

  if (!loaded) return null
  const offered = ENQUIRY_FORMS.filter((f) => types.includes(f.type))
  const all = `${origin}/enquire/${slug}`

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-pgm-ink mb-0.5">Enquiry forms</h2>
          <p className="text-xs text-gray-400">
            Forms hosted here, in the club’s colours. Link the club’s website buttons to them and every enquiry lands on its
            Enquiries board, with the email opt-in recorded.
          </p>
        </div>
        <Button type="button" className="whitespace-nowrap shrink-0" variant={enabled ? 'secondary' : 'primary'}
          onClick={() => save({ enabled: !enabled }, enabled ? '✓ Forms turned off. Their links now show “not found”.' : '✓ Forms are live')}>
          {enabled ? 'Turn off' : 'Turn on'}
        </Button>
      </div>

      <p className={`text-sm font-medium ${enabled ? 'text-pgm-green' : 'text-gray-500'}`}>
        {enabled ? '● Live' : '○ Off: the links below show “not found” until you turn the forms on'}
      </p>

      <fieldset>
        <legend className="text-sm font-medium text-pgm-ink mb-2">Forms the club offers</legend>
        <div className="flex flex-wrap gap-2">
          {ENQUIRY_FORMS.map((f) => (
            <label key={f.type} className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer ${types.includes(f.type) ? 'bg-pgm-green text-white border-pgm-green' : 'border-pgm-line text-gray-600'}`}>
              <input type="checkbox" className="sr-only" checked={types.includes(f.type)} onChange={() => toggleType(f.type)} />
              {f.title.replace(' enquiry', '')}
            </label>
          ))}
        </div>
      </fieldset>

      <form className="flex flex-col sm:flex-row gap-2 sm:items-end"
        onSubmit={(e) => { e.preventDefault(); save({ privacyPolicyUrl: privacy }, '✓ Privacy policy link saved') }}>
        <div className="flex-1">
          <Input id="privacyUrl" label="Club’s privacy policy link" value={privacy} onChange={(e) => setPrivacy(e.target.value)} placeholder="https://www.clubwebsite.co.uk/privacy-policy" />
        </div>
        <Button type="submit" variant="secondary">Save link</Button>
      </form>

      <div>
        <p className="text-sm font-medium text-pgm-ink mb-2">Links for the club’s website</p>
        <ul className="border border-pgm-line rounded-lg divide-y divide-pgm-line text-sm">
          {[{ label: 'All forms (one “Enquire” link)', url: all }, ...offered.map((f) => ({ label: f.title, url: `${all}/${f.slug}` }))].map((l) => (
            <li key={l.url} className="flex items-center gap-3 px-3 py-2">
              <span className="w-44 shrink-0 text-gray-600">{l.label}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-pgm-green underline underline-offset-2">{l.url.replace(/^https?:\/\//, '')}</a>
              <button type="button" onClick={() => copy(l.url)} className="text-xs font-medium text-pgm-ink border border-pgm-line rounded-md px-2 py-1 hover:bg-pgm-cream shrink-0">
                {copied === l.url ? 'Copied' : 'Copy'}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-2">
          Add <code>?utm_source=…&amp;utm_campaign=…</code> to a link in an email or ad and the enquiry shows which campaign it came from.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-pgm-green bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  )
}
