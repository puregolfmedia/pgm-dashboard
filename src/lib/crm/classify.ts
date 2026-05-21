import { TitleTier, IndustrySegment } from '@/generated/prisma/client'

const TIER_1_KEYWORDS = [
  'general manager', 'gm ', ' gm,', ' gm$',
  'managing director', 'md ', ' md,',
  'chief executive', 'ceo',
  'director', 'club manager', 'golf manager',
  'head of golf', 'owner', 'proprietor',
  'principal', 'president', 'chairman', 'chairwoman',
]

const TIER_2_KEYWORDS = [
  'head professional', 'head pro',
  'director of golf',
  'course manager', 'course superintendent',
  'club secretary', 'secretary manager',
  'operations manager', 'deputy manager',
  'deputy general manager',
  'golf operations',
]

const TIER_3_KEYWORDS = [
  'marketing manager', 'marketing director', 'head of marketing',
  'membership manager', 'membership director',
  'events manager', 'events director',
  'communications manager', 'digital manager',
  'sales manager', 'pr manager', 'brand manager',
]

export function classifyTitleTier(position: string | null | undefined): TitleTier {
  if (!position) return TitleTier.OTHER
  const lower = position.toLowerCase()

  if (TIER_2_KEYWORDS.some((k) => lower.includes(k))) return TitleTier.TIER_2
  if (TIER_1_KEYWORDS.some((k) => lower.includes(k.trim()))) return TitleTier.TIER_1
  if (TIER_3_KEYWORDS.some((k) => lower.includes(k))) return TitleTier.TIER_3
  return TitleTier.OTHER
}

export function classifyIndustrySegment(company: string | null | undefined): IndustrySegment {
  if (!company) return IndustrySegment.UNKNOWN
  const lower = company.toLowerCase()

  if (/association|federation|union|pga of|r&a|usga|golf foundation/.test(lower)) return IndustrySegment.ASSOCIATION
  if (/media|magazine|publishing|broadcast|podcast|press/.test(lower)) return IndustrySegment.GOLF_MEDIA
  if (/academy|school|coaching|learning centre/.test(lower)) return IndustrySegment.GOLF_ACADEMY
  if (/pro shop|retail|equipment|apparel|clothing|manufacturer|titleist|callaway|taylormade|ping|cobra|mizuno|footjoy|adidas|nike golf/.test(lower)) return IndustrySegment.GOLF_RETAIL
  if (/supplier|vendor|software|technology|tech/.test(lower)) return IndustrySegment.SUPPLIER_VENDOR
  if (/resort|hotel|lodge|spa|estate|manor/.test(lower)) return IndustrySegment.RESORT_GOLF
  if (/municipal|council|borough|district|local authority|parks/.test(lower)) return IndustrySegment.MUNICIPAL_PUBLIC
  if (/golf club|golf & country|golf and country|country club|golf course|links|members club/.test(lower)) return IndustrySegment.PRIVATE_MEMBERS_CLUB

  return IndustrySegment.UNKNOWN
}
