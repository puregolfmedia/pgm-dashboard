import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  const user = session?.user as any
  if (!session?.user || user.role !== 'ADMIN') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const clients = await prisma.client.findMany({
    include: { dataConfig: true, users: { where: { role: 'CLIENT' } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: clients, error: null })
}

export async function POST(request: Request) {
  const session = await auth()
  const user = session?.user as any
  if (!session?.user || user.role !== 'ADMIN') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, slug, username, password } = body

  if (!name || !slug || !username || !password) {
    return NextResponse.json({ data: null, error: 'Missing required fields' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const client = await prisma.client.create({
    data: {
      name,
      slug,
      users: {
        create: { username, passwordHash, role: 'CLIENT', passwordResetRequired: true },
      },
    },
  })

  return NextResponse.json({ data: client, error: null }, { status: 201 })
}
