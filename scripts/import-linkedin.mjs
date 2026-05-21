// One-shot LinkedIn CSV import script — run with: node scripts/import-linkedin.mjs
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const require = createRequire(import.meta.url)

// Load env
const dotenv = require('dotenv')
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const { PrismaClient } = require('./src/generated/prisma/client.js')
const prisma = new PrismaClient()

// ── Enums (mirrors generated values) ─────────────────────────────────────────
const TitleTier = { TIER_1: 'TIER_1', TIER_2: 'TIER_2', TIER_3: 'TIER_3', OTHER: 'OTHER' }
const IndustrySegment = {
  PRIVATE_MEMBERS_CLUB: 'PRIVATE_MEMBERS_CLUB', RESORT_GOLF: 'RESORT_GOLF',
  MUNICIPAL_PUBLIC: 'MUNICIPAL_PUBLIC', GOLF_ACADEMY: 'GOLF_ACADEMY',
  GOLF_RETAIL: 'GOLF_RETAIL', GOLF_MEDIA: 'GOLF_MEDIA',
  SUPPLIER_VENDOR: 'SUPPLIER_VENDOR', ASSOCIATION: 'ASSOCIATION', UNKNOWN: 'UNKNOWN',
}
const OutreachStatus = { NOT_STARTED: 'NOT_STARTED' }

// ── Classification ────────────────────────────────────────────────────────────
const TIER_2_KEYWORDS = [
  'head professional', 'head pro', 'director of golf',
  'course manager', 'course superintendent',
  'club secretary', 'secretary manager',
  'operations manager', 'deputy manager', 'deputy general manager', 'golf operations',
]
const TIER_1_KEYWORDS = [
  'general manager', ' gm ', 'managing director', ' md ',
  'chief executive', 'ceo', 'director', 'club manager', 'golf manager',
  'head of golf', 'owner', 'proprietor', 'principal', 'president',
  'chairman', 'chairwoman', 'chief operating', 'coo',
]
const TIER_3_KEYWORDS = [
  'marketing manager', 'marketing director', 'head of marketing',
  'membership manager', 'membership director', 'events manager', 'events director',
  'communications manager', 'digital manager', 'sales manager', 'pr manager', 'brand manager',
]

function classifyTitleTier(position) {
  if (!position) return TitleTier.OTHER
  const lower = ` ${position.toLowerCase()} `
  if (TIER_2_KEYWORDS.some(k => lower.includes(k))) return TitleTier.TIER_2
  if (TIER_1_KEYWORDS.some(k => lower.includes(k))) return TitleTier.TIER_1
  if (TIER_3_KEYWORDS.some(k => lower.includes(k))) return TitleTier.TIER_3
  return TitleTier.OTHER
}

function classifyIndustrySegment(company) {
  if (!company) return IndustrySegment.UNKNOWN
  const lower = company.toLowerCase()
  if (/association|federation|union|pga of|r&a|usga|golf foundation/.test(lower)) return IndustrySegment.ASSOCIATION
  if (/media|magazine|publishing|broadcast|podcast|press/.test(lower)) return IndustrySegment.GOLF_MEDIA
  if (/academy|school|coaching|learning centre/.test(lower)) return IndustrySegment.GOLF_ACADEMY
  if (/pro shop|retail|equipment|apparel|clothing|manufacturer|titleist|callaway|taylormade|ping|cobra|mizuno|footjoy/.test(lower)) return IndustrySegment.GOLF_RETAIL
  if (/supplier|vendor|software|technology|tech/.test(lower)) return IndustrySegment.SUPPLIER_VENDOR
  if (/resort|hotel|lodge|spa|estate|manor/.test(lower)) return IndustrySegment.RESORT_GOLF
  if (/municipal|council|borough|district|local authority|parks/.test(lower)) return IndustrySegment.MUNICIPAL_PUBLIC
  if (/golf club|golf & country|golf and country|country club|golf course|links|members club/.test(lower)) return IndustrySegment.PRIVATE_MEMBERS_CLUB
  return IndustrySegment.UNKNOWN
}

function calcPriorityScore({ titleTier, industrySegment, outreachStatus, lastContactedAt }) {
  const TIER_BASE = { TIER_1: 100, TIER_2: 60, TIER_3: 30, OTHER: 5 }
  const INDUSTRY_BONUS = { PRIVATE_MEMBERS_CLUB: 20, RESORT_GOLF: 15, GOLF_ACADEMY: 5 }
  if (outreachStatus === 'NOT_INTERESTED' || outreachStatus === 'MEETING_BOOKED') return 0
  let score = TIER_BASE[titleTier] ?? 5
  score += INDUSTRY_BONUS[industrySegment] ?? 0
  if (outreachStatus === 'NOT_STARTED') score += 20
  return score
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const result = []
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

function parseLinkedInDate(raw) {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

// ── Main ──────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2]
if (!csvPath) { console.error('Usage: node scripts/import-linkedin.mjs <path/to/Connections.csv>'); process.exit(1) }

const text = readFileSync(csvPath, 'utf-8')
const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

const headerIdx = lines.findIndex(l => /first.?name/i.test(l) && /last.?name/i.test(l))
if (headerIdx === -1) { console.error('Could not find CSV header row'); process.exit(1) }

const headers = parseCsvLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
const col = (row, name) => { const i = headers.indexOf(name); return i >= 0 ? row[i] ?? '' : '' }

const rows = lines.slice(headerIdx + 1)
console.log(`Found ${rows.length} data rows. Importing…\n`)

let imported = 0, skipped = 0, errors = 0

// Tier breakdown counters
const tierCount = { TIER_1: 0, TIER_2: 0, TIER_3: 0, OTHER: 0 }
const segCount = {}

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
  const priorityScore = calcPriorityScore({ titleTier, industrySegment, outreachStatus: 'NOT_STARTED', lastContactedAt: null })

  tierCount[titleTier]++
  segCount[industrySegment] = (segCount[industrySegment] ?? 0) + 1

  const upsertKey = linkedinUrl ?? `__nurl__${firstName}_${lastName}_${company}`

  try {
    await prisma.contact.upsert({
      where: { linkedinUrl: upsertKey },
      update: { firstName, lastName, company, position, email, connectedOn, titleTier, industrySegment, priorityScore },
      create: { firstName, lastName, company, position, email, linkedinUrl: upsertKey, connectedOn, titleTier, industrySegment, priorityScore },
    })
    imported++
  } catch (e) {
    errors++
    console.error(`  ✗ ${firstName} ${lastName}: ${e.message}`)
  }
}

console.log(`\n✅ Import complete`)
console.log(`   Imported : ${imported}`)
console.log(`   Skipped  : ${skipped}`)
console.log(`   Errors   : ${errors}`)
console.log(`\nTitle tiers:`)
console.log(`   Tier 1 (Director/GM)         : ${tierCount.TIER_1}`)
console.log(`   Tier 2 (Head Pro/Manager)    : ${tierCount.TIER_2}`)
console.log(`   Tier 3 (Marketing/Membership): ${tierCount.TIER_3}`)
console.log(`   Other                        : ${tierCount.OTHER}`)
console.log(`\nIndustry segments:`)
for (const [seg, count] of Object.entries(segCount).sort((a,b) => b[1]-a[1])) {
  console.log(`   ${seg.padEnd(25)}: ${count}`)
}

await prisma.$disconnect()
