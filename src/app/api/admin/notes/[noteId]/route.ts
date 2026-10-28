import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

export async function DELETE(_r: Request, { params }: { params: { noteId: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  await prisma.note.delete({ where: { id: params.noteId } }).catch(() => null)
  return NextResponse.json({ data: { ok: true }, error: null })
}
