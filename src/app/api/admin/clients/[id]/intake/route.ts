import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

// Create (or replace) the secret form address for a club. Replacing it stops
// any form still using the old address, so only do it if the address leaked.
export async function POST(_r: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const intakeToken = randomBytes(24).toString('base64url')
  await prisma.client.update({ where: { id: params.id }, data: { intakeToken } })
  return NextResponse.json({ data: { intakeToken }, error: null })
}
