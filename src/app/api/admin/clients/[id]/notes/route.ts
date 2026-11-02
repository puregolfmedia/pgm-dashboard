import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/access'

export async function GET(_r: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const notes = await prisma.note.findMany({ where: { clientId: params.id }, orderBy: { date: 'desc' }, take: 100 })
  return NextResponse.json({ data: notes, error: null })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  const b = await request.json().catch(() => ({}))
  const date = new Date(b.date)
  if (!b.text?.trim() || isNaN(date.getTime())) {
    return NextResponse.json({ data: null, error: 'Add a date and what was done' }, { status: 400 })
  }
  const note = await prisma.note.create({ data: { clientId: params.id, date, text: b.text.trim().slice(0, 140) } })
  return NextResponse.json({ data: note, error: null })
}
