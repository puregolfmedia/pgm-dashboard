import { TitleTier, IndustrySegment, OutreachStatus, CountryRegion } from '@/generated/prisma/client'
import { COUNTRY_REGION_BONUS, getCountyBonus } from './location'

const TIER_BASE: Record<TitleTier, number> = {
  TIER_1: 100,
  TIER_2: 60,
  TIER_3: 30,
  OTHER: 5,
}

const INDUSTRY_BONUS: Partial<Record<IndustrySegment, number>> = {
  PRIVATE_MEMBERS_CLUB: 20,
  RESORT_GOLF: 15,
  GOLF_ACADEMY: 5,
}

export function calcPriorityScore({
  titleTier,
  industrySegment,
  outreachStatus,
  countryRegion,
  country,
  lastContactedAt,
}: {
  titleTier: TitleTier
  industrySegment: IndustrySegment
  outreachStatus: OutreachStatus
  countryRegion?: CountryRegion | null
  country?: string | null
  lastContactedAt: Date | null
}): number {
  if (outreachStatus === OutreachStatus.NOT_INTERESTED || outreachStatus === OutreachStatus.MEETING_BOOKED) {
    return 0
  }

  let score = TIER_BASE[titleTier]
  score += INDUSTRY_BONUS[industrySegment] ?? 0
  score += COUNTRY_REGION_BONUS[countryRegion ?? CountryRegion.UNKNOWN] ?? 0
  score += getCountyBonus(country)

  if (outreachStatus === OutreachStatus.NOT_STARTED) {
    score += 20
  } else if (outreachStatus === OutreachStatus.MESSAGED || outreachStatus === OutreachStatus.NO_RESPONSE) {
    if (lastContactedAt) {
      const daysSince = (Date.now() - lastContactedAt.getTime()) / 86_400_000
      if (daysSince > 7) score += 30
      if (daysSince > 30) score += 20
    } else {
      score += 30
    }
  } else if (outreachStatus === OutreachStatus.REPLIED) {
    score = Math.max(0, score - 40)
  }

  return score
}
