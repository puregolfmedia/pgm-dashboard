import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'
import { parseType } from '@/lib/crm'

// A club's enquiry form settings: whether its hosted forms are live, which
// forms it offers, and the privacy policy linked under each.

const select = { enabled: true, formTypes: true, privacyPolicyUrl: true } as const

export async function GET(_r: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const client = await prisma.client.findUnique({ where: { id: params.id }, select: { slug: true, crmSettings: { select } } })
  if (!client) return NextResponse.json({ data: null, error: 'Club not found' }, { status: 404 })
  return NextResponse.json({ data: { slug: client.slug, settings: client.crmSettings }, error: null })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof b.enabled === 'boolean') data.enabled = b.enabled
  if (Array.isArray(b.formTypes)) data.formTypes = b.formTypes.map(parseType).filter(Boolean)
  if (b.privacyPolicyUrl !== undefined) {
    const url = typeof b.privacyPolicyUrl === 'string' ? b.privacyPolicyUrl.trim() : ''
    if (url && !/^https:\/\/[^\s]+\.[^\s]+$/.test(url)) {
      return NextResponse.json({ data: null, error: 'The privacy policy link should start with https://' }, { status: 400 })
    }
    data.privacyPolicyUrl = url || null
  }
  if (!(await prisma.client.findUnique({ where: { id: params.id }, select: { id: true } }))) {
    return NextResponse.json({ data: null, error: 'Club not found' }, { status: 404 })
  }
  const settings = await prisma.crmSettings.upsert({
    where: { clientId: params.id }, create: { clientId: params.id, ...data }, update: data, select,
  })
  return NextResponse.json({ data: settings, error: null })
}
