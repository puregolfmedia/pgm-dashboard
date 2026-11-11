import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

export async function DELETE(_r: Request, { params }: { params: { entryId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  await prisma.membershipValue.delete({ where: { id: params.entryId } }).catch(() => null)
  return NextResponse.json({ data: { ok: true }, error: null })
}
