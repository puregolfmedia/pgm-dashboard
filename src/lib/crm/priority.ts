import { TitleTier, IndustrySegment, OutreachStatus } from '@/generated/prisma/client'

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
  lastContactedAt,
}: {
  titleTier: TitleTier
  industrySegment: IndustrySegment
  outreachStatus: OutreachStatus
  lastContactedAt: Date | null
}): number {
  if (outreachStatus === OutreachStatus.NOT_INTERESTED || outreachStatus === OutreachStatus.MEETING_BOOKED) {
    return 0
  }

  let score = TIER_BASE[titleTier]
  score += INDUSTRY_BONUS[industrySegment] ?? 0

  if (outreachStatus === OutreachStatus.NOT_STARTED) {
    score += 20
  } else if (outreachStatus === OutreachStatus.MESSAGED || outreachStatus === OutreachStatus.NO_RESPONSE) {
    // Follow-up overdue: > 7 days since last contact
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
