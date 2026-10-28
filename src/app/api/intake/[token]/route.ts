import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { flatten, parseEnquiry } from '@/lib/intake'

// Public endpoint that website forms post enquiries to:
//   POST /api/intake/<club's secret token>?category=Christmas%20party
// Accepts JSON (e.g. a FormSubmit `_webhook`) or a normal HTML form post.
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

  const category = new URL(request.url).searchParams.get('category')?.slice(0, 100) || parsed.category
  await prisma.enquiry.create({
    data: { clientId: client.id, source: 'form', ...parsed, category },
  })
  return done()
}
