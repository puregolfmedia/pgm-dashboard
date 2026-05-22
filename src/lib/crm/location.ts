import { CountryRegion } from '@/generated/prisma/client'

// High-confidence UK golf bodies — these are almost certainly UK-based
const UK_EXACT: RegExp[] = [
  /\bEngland Golf\b/i,
  /\bScottish Golf\b/i,
  /\bGolf Wales\b/i,
  /\bWales Golf\b/i,
  /\bGolfing Union of Ireland\b/i,  // technically Ireland but linked to UK golf
  /\bR&A\b/i,
  /\bThe R&A\b/i,
  /\bEuropean Tour\b/i,
  /\bDP World Tour\b/i,
  /\bLadies European Tour\b/i,
  /\bEngland Golf Partnership\b/i,
  /\bPGA.*Great Britain\b/i,
  /\bThe PGA\b/i,
  /\bGolf Foundation\b/i,
  /\bSt Andrews Links\b/i,
  /\bLinks.*St Andrews\b/i,
]

// High-confidence non-UK patterns — avoid misclassifying these
const NON_UK_PATTERNS: RegExp[] = [
  // USA
  /\bPGA of America\b/i,
  /\bUSGA\b/i,
  /\bAmerican Golf\b/i,
  // Australia
  /\bGolf Australia\b/i,
  /\bPGA of Australia\b/i,
  // Asia
  /\bSentosa\b/i,
  /\bHong Kong Golf\b/i,
  /\bJapan Golf\b/i,
  // Europe (non-UK)
  /\bRoyal Belgian\b/i,
  /\bFederacion.*Golf\b/i,
]

export function classifyCountryRegion(company: string | null | undefined): CountryRegion {
  if (!company) return CountryRegion.UNKNOWN
  const name = company.trim()

  // Skip if matches a known non-UK pattern first
  if (NON_UK_PATTERNS.some(p => p.test(name))) return CountryRegion.UNKNOWN

  if (UK_EXACT.some(p => p.test(name))) return CountryRegion.UK

  return CountryRegion.UNKNOWN
}

// Lookup table for the dropdown in the UI
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
