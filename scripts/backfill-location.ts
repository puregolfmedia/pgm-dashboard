// Backfill countryRegion for all contacts using auto-detection,
// then recalculate all priority scores.
// Run: DATABASE_URL=... npx tsx scripts/backfill-location.ts
import { prisma } from '../src/lib/prisma'
import { classifyCountryRegion } from '../src/lib/crm/location'
import { calcPriorityScore } from '../src/lib/crm/priority'
import { CountryRegion } from '../src/generated/prisma/client'

async function main() {
  const contacts = await prisma.contact.findMany()
  console.log(`Backfilling ${contacts.length} contacts…`)

  let detected = 0
  const regionCount: Record<string, number> = {}

  for (const c of contacts) {
    const countryRegion = classifyCountryRegion(c.company)
    if (countryRegion !== CountryRegion.UNKNOWN) detected++
    regionCount[countryRegion] = (regionCount[countryRegion] ?? 0) + 1

    const priorityScore = calcPriorityScore({
      titleTier: c.titleTier,
      industrySegment: c.industrySegment,
      outreachStatus: c.outreachStatus,
      countryRegion,
      lastContactedAt: c.lastContactedAt,
    })

    await prisma.contact.update({
      where: { id: c.id },
      data: { countryRegion, priorityScore },
    })
  }

  console.log(`\n✅  Done. Auto-detected ${detected} contacts.`)
  console.log('\nRegion breakdown:')
  for (const [region, count] of Object.entries(regionCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${region.padEnd(20)}: ${count}`)
  }
  console.log(`\n⚠️  ${regionCount['UNKNOWN'] ?? 0} contacts still need manual location assignment.`)
  console.log('Use the /crm page to bulk-assign them by searching for company names.')

  await prisma.$disconnect()
}

main().catch(console.error)
