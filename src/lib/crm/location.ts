import { CountryRegion } from '@/generated/prisma/enums'

// ── County proximity tiers (centred on Chelmsford, Essex) ────────────────────
//
// Tier 1 — Home county
// Tier 2 — Direct neighbours (~30–60 miles)
// Tier 3 — One county further (~60–100 miles)
// Tier 4 — Wider South / Midlands (~100–180 miles)
// Tier 5 — North England / Wales
// Tier 6 — Scotland / Northern Ireland

export const COUNTY_PROXIMITY_BONUS: Record<string, number> = {
  // Tier 1 — Home (40pts)
  'Essex':                  40,

  // Tier 2 — Direct neighbours (30pts)
  'Hertfordshire':          30,
  'Suffolk':                30,
  'Kent':                   30,
  'Greater London':         30,
  'London':                 30,

  // Tier 3 — One step further (20pts)
  'Cambridgeshire':         20,
  'Norfolk':                20,
  'Surrey':                 20,
  'East Sussex':            20,
  'West Sussex':            20,
  'Berkshire':              20,
  'Buckinghamshire':        20,
  'Bedfordshire':           20,

  // Tier 4 — Wider South & Midlands (12pts)
  'Oxfordshire':            12,
  'Hampshire':              12,
  'Dorset':                 12,
  'Wiltshire':              12,
  'Gloucestershire':        12,
  'Northamptonshire':       12,
  'Leicestershire':         12,
  'Nottinghamshire':        12,
  'Lincolnshire':           12,
  'Warwickshire':           12,
  'West Midlands':          12,
  'Birmingham':             12,

  // Tier 5 — North England & Wales (5pts)
  'Yorkshire':              5,
  'North Yorkshire':        5,
  'South Yorkshire':        5,
  'West Yorkshire':         5,
  'East Yorkshire':         5,
  'Lancashire':             5,
  'Cheshire':               5,
  'Derbyshire':             5,
  'Staffordshire':          5,
  'Shropshire':             5,
  'Herefordshire':          5,
  'Worcestershire':         5,
  'Somerset':               5,
  'Devon':                  5,
  'Cornwall':               5,
  'Wales':                  5,
  'Gwynedd':                5,
  'Powys':                  5,
  'Pembrokeshire':          5,
  'Merseyside':             5,
  'Tyne and Wear':          5,
  'Durham':                 5,
  'Cumbria':                5,
  'Northumberland':         5,

  // Tier 6 — Scotland & NI (0 extra — base UK bonus applies)
  'Scotland':               0,
  'Edinburgh':              0,
  'Glasgow':                0,
  'Northern Ireland':       0,
  'Belfast':                0,
}

// Sorted list for the UI dropdown — Tier 1 first, then alphabetical within tier
export const UK_COUNTIES: string[] = [
  'Essex',
  '— Neighbours',
  'Greater London', 'Hertfordshire', 'Kent', 'Suffolk',
  '— East of England',
  'Bedfordshire', 'Cambridgeshire', 'Norfolk',
  '— South East',
  'Berkshire', 'Buckinghamshire', 'East Sussex', 'Hampshire',
  'Oxfordshire', 'Surrey', 'West Sussex',
  '— South West',
  'Cornwall', 'Devon', 'Dorset', 'Gloucestershire', 'Somerset', 'Wiltshire',
  '— Midlands',
  'Derbyshire', 'Herefordshire', 'Leicestershire', 'Lincolnshire',
  'Northamptonshire', 'Nottinghamshire', 'Shropshire', 'Staffordshire',
  'Warwickshire', 'West Midlands', 'Worcestershire',
  '— North England',
  'Cheshire', 'Cumbria', 'Durham', 'Lancashire', 'Merseyside',
  'Northumberland', 'Tyne and Wear',
  'East Yorkshire', 'North Yorkshire', 'South Yorkshire', 'West Yorkshire',
  '— Wales',
  'Wales',
  '— Scotland',
  'Scotland',
  '— Northern Ireland',
  'Northern Ireland',
]

export function getCountyBonus(country: string | null | undefined): number {
  if (!country) return 0
  return COUNTY_PROXIMITY_BONUS[country] ?? 0
}

// High-confidence UK golf bodies
const UK_EXACT: RegExp[] = [
  /\bEngland Golf\b/i,
  /\bScottish Golf\b/i,
  /\bGolf Wales\b/i,
  /\bWales Golf\b/i,
  /\bR&A\b/i,
  /\bThe R&A\b/i,
  /\bEuropean Tour\b/i,
  /\bDP World Tour\b/i,
  /\bLadies European Tour\b/i,
  /\bPGA.*Great Britain\b/i,
  /\bThe PGA\b/i,
  /\bGolf Foundation\b/i,
  /\bSt Andrews Links\b/i,
]

const NON_UK_PATTERNS: RegExp[] = [
  /\bPGA of America\b/i,
  /\bUSGA\b/i,
  /\bAmerican Golf\b/i,
  /\bGolf Australia\b/i,
  /\bPGA of Australia\b/i,
  /\bSentosa\b/i,
  /\bHong Kong Golf\b/i,
  /\bJapan Golf\b/i,
  /\bRoyal Belgian\b/i,
  /\bFederacion.*Golf\b/i,
]

export function classifyCountryRegion(company: string | null | undefined): CountryRegion {
  if (!company) return CountryRegion.UNKNOWN
  const name = company.trim()
  if (NON_UK_PATTERNS.some(p => p.test(name))) return CountryRegion.UNKNOWN
  if (UK_EXACT.some(p => p.test(name))) return CountryRegion.UK
  return CountryRegion.UNKNOWN
}

export const COUNTRY_REGION_LABEL: Record<CountryRegion, string> = {
  UK: '🇬🇧 United Kingdom',
  IRELAND: '🇮🇪 Ireland',
  EUROPE: '🌍 Europe',
  NORTH_AMERICA: '🌎 North America',
  AUSTRALIA_NZ: '🦘 Australia / NZ',
  ASIA: '🌏 Asia',
  REST_OF_WORLD: '🌐 Rest of World',
  UNKNOWN: '— Unknown',
}

export const COUNTRY_REGION_BONUS: Partial<Record<CountryRegion, number>> = {
  UK: 30,
  IRELAND: 15,
  EUROPE: 5,
}
