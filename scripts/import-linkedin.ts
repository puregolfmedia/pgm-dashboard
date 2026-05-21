// Run with: npx tsx --tsconfig tsconfig.json scripts/import-linkedin.ts <path/to/Connections.csv>
import { readFileSync } from 'fs'
import { prisma } from '../src/lib/prisma'
import { classifyTitleTier, classifyIndustrySegment } from '../src/lib/crm/classify'
import { calcPriorityScore } from '../src/lib/crm/priority'
import { OutreachStatus } from '../src/generated/prisma/client'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let inQuotes = false
  let current = ''
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseLinkedInDate(raw: string | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) { console.error('Usage: npx tsx scripts/import-linkedin.ts <path/to/Connections.csv>'); process.exit(1) }

  const text = readFileSync(csvPath, 'utf-8')
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const headerIdx = lines.findIndex(l => /first.?name/i.test(l) && /last.?name/i.test(l))
  if (headerIdx === -1) { console.error('Could not find CSV header row'); process.exit(1) }

  const headers = parseCsvLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const col = (row: string[], name: string) => { const i = headers.indexOf(name); return i >= 0 ? row[i] ?? '' : '' }

  const rows = lines.slice(headerIdx + 1)
  console.log(`\nFound ${rows.length} rows after header. Importing into database…\n`)

  let imported = 0, skipped = 0, errors = 0
  const tierCount: Record<string, number> = { TIER_1: 0, TIER_2: 0, TIER_3: 0, OTHER: 0 }
  const segCount: Record<string, number> = {}

  for (const line of rows) {
    if (!line) continue
    const row = parseCsvLine(line)
    const firstName = col(row, 'first_name')
    const lastName = col(row, 'last_name')
    if (!firstName && !lastName) { skipped++; continue }

    const position = col(row, 'position') || null
    const company = col(row, 'company') || null
    const linkedinUrl = col(row, 'url') || null
    const email = col(row, 'email_address') || null
    const connectedOn = parseLinkedInDate(col(row, 'connected_on'))

    const titleTier = classifyTitleTier(position)
    const industrySegment = classifyIndustrySegment(company)
    const priorityScore = calcPriorityScore({
      titleTier, industrySegment,
      outreachStatus: OutreachStatus.NOT_STARTED,
      lastContactedAt: null,
    })

    tierCount[titleTier] = (tierCount[titleTier] ?? 0) + 1
    segCount[industrySegment] = (segCount[industrySegment] ?? 0) + 1

    const upsertKey = linkedinUrl ?? `__nurl__${firstName}_${lastName}_${company}`

    try {
      await prisma.contact.upsert({
        where: { linkedinUrl: upsertKey },
        update: { firstName, lastName, company, position, email, connectedOn, titleTier, industrySegment, priorityScore },
        create: { firstName, lastName, company, position, email, linkedinUrl: upsertKey, connectedOn, titleTier, industrySegment, priorityScore },
      })
      imported++
    } catch (e: any) {
      errors++
      console.error(`  ✗ ${firstName} ${lastName}: ${e.message}`)
    }
  }

  await prisma.$disconnect()

  console.log(`✅  Import complete`)
  console.log(`    Imported : ${imported}`)
  console.log(`    Skipped  : ${skipped}`)
  console.log(`    Errors   : ${errors}`)
  console.log(`\n📊  Title tiers:`)
  console.log(`    Tier 1  Director / GM             : ${tierCount.TIER_1}`)
  console.log(`    Tier 2  Head Pro / Club Manager   : ${tierCount.TIER_2}`)
  console.log(`    Tier 3  Marketing / Membership    : ${tierCount.TIER_3}`)
  console.log(`    Other                             : ${tierCount.OTHER}`)
  console.log(`\n🏌️  Industry segments:`)
  for (const [seg, count] of Object.entries(segCount).sort((a, b) => (b[1] as number) - (a[1] as number))) {
    console.log(`    ${seg.padEnd(28)}: ${count}`)
  }
}

main().catch(console.error)
