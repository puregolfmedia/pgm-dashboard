import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function adminOnly(session: any) {
  return !session?.user || (session.user as any).role !== 'ADMIN'
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (adminOnly(session)) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { body: noteBody } = await request.json()
  if (!noteBody?.trim()) return NextResponse.json({ data: null, error: 'Note body required' }, { status: 400 })

  const note = await prisma.contactNote.create({
    data: { contactId: id, body: noteBody.trim() },
  })

  return NextResponse.json({ data: note, error: null }, { status: 201 })
}
