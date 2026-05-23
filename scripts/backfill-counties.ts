import { Client } from 'pg'

const COMPANY_COUNTY: Record<string, string> = {
  'DP World Tour':                         'Surrey',
  'England Golf':                          'Lincolnshire',
  'England Golf (English Golf Union Ltd)': 'Lincolnshire',
  'Golf Foundation':                       'Lincolnshire',
  'Ladies European Tour':                  'Buckinghamshire',
  'Links Golf St Andrews':                 'Scotland',
  'Scottish Golf Noticeboard':             'Scotland',
  'St Andrews Links':                      'Scotland',
  'The PGA':                               'Warwickshire',
  'The R&A':                               'Scotland',
  'Wales Golf':                            'Wales',
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const { rows } = await client.query<{ id: string; firstName: string; lastName: string; company: string }>(
    `SELECT id, "firstName", "lastName", company FROM "Contact" WHERE "countryRegion" = 'UK' AND country IS NULL`
  )

  let updated = 0
  for (const c of rows) {
    const county = COMPANY_COUNTY[c.company ?? '']
    if (!county) {
      console.log(`  skip (no mapping): ${c.company}`)
      continue
    }
    await client.query(`UPDATE "Contact" SET country = $1, "updatedAt" = NOW() WHERE id = $2`, [county, c.id])
    console.log(`  ✓ ${c.firstName} ${c.lastName} (${c.company}) → ${county}`)
    updated++
  }

  console.log(`\nUpdated ${updated}/${rows.length}`)
  await client.end()
}

main().catch(console.error)
