import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ContactDetail from '@/components/crm/ContactDetail'

export const dynamic = 'force-dynamic'

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      outreachLogs: { orderBy: { sentAt: 'desc' } },
    },
  })

  if (!contact) notFound()

  return <ContactDetail contact={contact} />
}
