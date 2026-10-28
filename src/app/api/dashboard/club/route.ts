import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveClientAccess } from '@/lib/access'

// Name and branding of the club whose dashboard is being viewed.
export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access
  const club = await prisma.client.findUnique({
    where: { id: access.clientId },
    select: { name: true, logoUrl: true, brandColor: true, isDemo: true },
  })
  if (!club) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: club, error: null })
}
