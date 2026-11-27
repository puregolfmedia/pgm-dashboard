import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { flatten, parseEnquiry } from '@/lib/intake'
import { createEnquiry, parseType } from '@/lib/crm'
import { piiReady } from '@/lib/pii'
import { allowRequest, requesterKey } from '@/lib/rateLimit'

// Public endpoint that website forms post enquiries to:
//   POST /api/intake/<club's secret token>?category=Christmas%20party&type=FUNCTION
// Accepts JSON (e.g. a FormSubmit `_webhook`) or a normal HTML form post.
// Optional fields: enquiry_type, utm_source / utm_medium / utm_campaign,
// marketing_consent (a ticked box) and form_name.
// The token is the only credential, so it is long and random, and can be
// regenerated from the admin panel if it leaks.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const MAX_BODY = 20_000

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const client = params.token.length >= 20
    ? await prisma.client.findUnique({ where: { intakeToken: params.token }, select: { id: true } })
    : null
  if (!client) return NextResponse.json({ ok: false, error: 'Unknown form address' }, { status: 404, headers: CORS })

  // At most 30 enquiries an hour from one connection to one club's address
  if (!(await allowRequest(requesterKey(request, `intake:${client.id}`), 30, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, error: 'Too many enquiries. Try again later.' }, { status: 429, headers: CORS })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY) return NextResponse.json({ ok: false, error: 'Too large' }, { status: 413, headers: CORS })

  const type = request.headers.get('content-type') ?? ''
  let fields: Record<string, string>
  try {
    fields = type.includes('application/json')
      ? flatten(JSON.parse(raw))
      : Object.fromEntries(new URLSearchParams(raw))
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not read the form data' }, { status: 400, headers: CORS })
  }

  const redirectTo = fields._next || fields._redirect
  const done = () => redirectTo && /^https?:\/\//.test(redirectTo)
    ? NextResponse.redirect(redirectTo, 303)
    : NextResponse.json({ ok: true }, { headers: CORS })

  // Spam trap: a hidden field real people leave empty
  if (fields._honey || fields._gotcha) return done()

  const parsed = parseEnquiry(fields)
  if (!parsed.name && !parsed.email && !parsed.phone && !parsed.message) {
    return NextResponse.json({ ok: false, error: 'Empty enquiry' }, { status: 400, headers: CORS })
  }

  // Personal details are only ever stored encrypted; without the keys, refuse rather than store plain text
  if (!piiReady()) {
    console.error('[intake] PII keys missing: enquiry not stored')
    return NextResponse.json({ ok: false, error: 'Enquiries are temporarily unavailable' }, { status: 503, headers: CORS })
  }

  const query = new URL(request.url).searchParams
  const category = query.get('category')?.slice(0, 100) || parsed.category
  const ticked = (v?: string) => !!v && /^(1|true|yes|on|y)$/i.test(v.trim())
  await createEnquiry({
    clientId: client.id,
    name: parsed.name, email: parsed.email, phone: parsed.phone, message: parsed.message, eventDate: parsed.eventDate,
    category,
    type: parseType(query.get('type')?.toUpperCase()) ?? parseType(fields.enquiry_type?.toUpperCase()),
    source: 'website_form',
    sourceDetail: fields.form_name || query.get('form') || category,
    utmSource: fields.utm_source || query.get('utm_source'),
    utmMedium: fields.utm_medium || query.get('utm_medium'),
    utmCampaign: fields.utm_campaign || query.get('utm_campaign'),
    marketingConsent: ticked(fields.marketing_consent ?? fields.consent),
    consentWording: fields.consent_wording,
  })
  return done()
}
