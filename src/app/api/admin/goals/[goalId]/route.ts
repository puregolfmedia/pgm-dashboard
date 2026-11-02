import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

export async function DELETE(_r: Request, { params }: { params: { goalId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  await prisma.goal.delete({ where: { id: params.goalId } }).catch(() => null)
  return NextResponse.json({ data: { ok: true }, error: null })
}
