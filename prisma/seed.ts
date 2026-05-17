import { config } from 'dotenv'
config({ path: '.env.local' })
import { PrismaClient, Role } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminPassword) throw new Error('SEED_ADMIN_PASSWORD env var required')

  const adminHash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.upsert({
    where: { username: 'pgm-admin' },
    update: {},
    create: {
      username: 'pgm-admin',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  })

  const demoClient = await prisma.client.upsert({
    where: { slug: 'demo-golf-club' },
    update: {},
    create: {
      name: 'Demo Golf Club',
      slug: 'demo-golf-club',
    },
  })

  const clientHash = await bcrypt.hash('demo-password-change-me', 12)
  await prisma.user.upsert({
    where: { username: 'demo-golf-club' },
    update: {},
    create: {
      username: 'demo-golf-club',
      passwordHash: clientHash,
      role: Role.CLIENT,
      clientId: demoClient.id,
      passwordResetRequired: true,
    },
  })

  console.log('Seed complete: pgm-admin + demo-golf-club created')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
