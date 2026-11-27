import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createEnquiry } from '@/lib/crm'
import { piiReady } from '@/lib/pii'
import { formBySlug, consentWording } from '@/lib/enquiryForms'
import { allowRequest, requesterKey } from '@/lib/rateLimit'

// Submissions from the hosted enquiry forms (/enquire/<club>/<form>).
// Public, so: a hidden spam-trap field, a minimum time on the page, and a limit
// of 5 enquiries an hour from one connection per club.

const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request, { params }: { params: { club: string } }) {
  const raw = await request.text()
  if (raw.length > 20_000) return NextResponse.json({ ok: false, error: 'That’s too long to send. Please shorten your message.' }, { status: 413 })
  let b: Record<string, unknown>
  try { b = JSON.parse(raw) } catch { return NextResponse.json({ ok: false, error: 'Could not read the form' }, { status: 400 }) }

  const client = await prisma.client.findUnique({
    where: { slug: params.club },
    select: { id: true, name: true, crmSettings: { select: { enabled: true, formTypes: true } } },
  })
  const form = formBySlug(str(b.form, 40))
  if (!client || !form || !client.crmSettings?.enabled || !client.crmSettings.formTypes.includes(form.type)) {
    return NextResponse.json({ ok: false, error: 'This form isn’t available' }, { status: 404 })
  }

  // Bots: fill the hidden field, or submit faster than a person could. Look successful, store nothing.
  const startedAt = Number(b._t)
  if (str(b._honey, 200) || !startedAt || Date.now() - startedAt < 3000) return NextResponse.json({ ok: true })

  const name = str(b.name, 200), email = str(b.email, 320), phone = str(b.phone, 50)
  if (!name) return NextResponse.json({ ok: false, error: 'Add your name', field: 'name' }, { status: 400 })
  if (!EMAIL.test(email)) return NextResponse.json({ ok: false, error: 'Add a valid email address', field: 'email' }, { status: 400 })
  if (phone && phone.replace(/\D/g, '').length < 7) return NextResponse.json({ ok: false, error: 'Check your phone number', field: 'phone' }, { status: 400 })

  // Each question's answer: some have their own place, the rest go into the message as "Question: answer"
  let eventDate: string | null = null, category: string | null = null, text = ''
  const lines: string[] = []
  for (const f of form.fields) {
    const v = str(b[f.name], f.kind === 'textarea' ? 4000 : 200)
    if (f.required && !v) return NextResponse.json({ ok: false, error: `Fill in “${f.label}”`, field: f.name }, { status: 400 })
    if (f.options && v && !f.options.includes(v)) return NextResponse.json({ ok: false, error: `Choose an answer for “${f.label}”`, field: f.name }, { status: 400 })
    if (!v) continue
    if (f.storeAs === 'eventDate') eventDate = v
    else if (f.storeAs === 'category') category = v
    else if (f.name === 'message') text = v
    else lines.push(`${f.label.replace(/\s*\(.*\)\s*$/, '').replace(/\?$/, '')}: ${v}`)
  }
  const messageText = [lines.join('\n'), text].filter(Boolean).join('\n\n') || null

  // Counted only once the form is filled in properly, so fixing a typo doesn't use up a go
  if (!(await allowRequest(requesterKey(request, `form:${client.id}`), 5, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: 'We’ve had several enquiries from you in the last hour. Please try again later, or phone the club.' }, { status: 429 })
  }

  if (!piiReady()) {
    console.error('[enquire] PII keys missing: enquiry not stored')
    return NextResponse.json({ ok: false, error: 'Enquiries can’t be sent right now. Please phone the club.' }, { status: 503 })
  }

  await createEnquiry({
    clientId: client.id,
    name, email, phone: phone || null,
    message: messageText, eventDate, category,
    type: form.type,
    source: 'website_form',
    sourceDetail: `${form.title} (dashboard form)`,
    utmSource: str(b.utm_source, 100) || null,
    utmMedium: str(b.utm_medium, 100) || null,
    utmCampaign: str(b.utm_campaign, 200) || null,
    marketingConsent: b.marketing_consent === true,
    // Stored exactly as it was shown beside the tick box
    consentWording: consentWording(client.name),
  })
  return NextResponse.json({ ok: true })
}
