import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { classifyTitleTier, classifyIndustrySegment } from '@/lib/crm/classify'
import { calcPriorityScore } from '@/lib/crm/priority'
import { OutreachStatus } from '@/generated/prisma/client'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

function parseLinkedInDate(raw: string | undefined): Date | null {
  if (!raw) return null
  // LinkedIn format: "20 Feb 2024" or "2024-02-20"
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let inQuotes = false
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(request: Request) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ data: null, error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ data: null, error: 'CSV appears empty' }, { status: 400 })
  }

  // Detect header row — LinkedIn may prepend 2-3 metadata lines before the header
  const headerIdx = lines.findIndex((l) =>
    /first.?name/i.test(l) && /last.?name/i.test(l)
  )
  if (headerIdx === -1) {
    return NextResponse.json({ data: null, error: 'Could not find CSV header row (expected First Name, Last Name columns)' }, { status: 400 })
  }

  const headers = parseCsvLine(lines[headerIdx]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name)
    return idx >= 0 ? row[idx] ?? '' : ''
  }

  const rows = lines.slice(headerIdx + 1)
  let imported = 0
  let skipped = 0

  for (const line of rows) {
    if (!line) continue
    const row = parseCsvLine(line)
    const firstName = col(row, 'first_name')
    const lastName = col(row, 'last_name')
    if (!firstName && !lastName) { skipped++; continue }

    const position = col(row, 'position')
    const company = col(row, 'company')
    const linkedinUrl = col(row, 'url') || null
    const email = col(row, 'email_address') || null
    const connectedOn = parseLinkedInDate(col(row, 'connected_on'))

    const titleTier = classifyTitleTier(position)
    const industrySegment = classifyIndustrySegment(company)
    const priorityScore = calcPriorityScore({
      titleTier,
      industrySegment,
      outreachStatus: OutreachStatus.NOT_STARTED,
      lastContactedAt: null,
    })

    await prisma.contact.upsert({
      where: { linkedinUrl: linkedinUrl ?? `__no_url__${firstName}_${lastName}_${company}` },
      update: { firstName, lastName, company, position, email, connectedOn, titleTier, industrySegment, priorityScore },
      create: { firstName, lastName, company, position, email, linkedinUrl, connectedOn, titleTier, industrySegment, priorityScore },
    })
    imported++
  }

  return NextResponse.json({ data: { imported, skipped }, error: null })
}
