import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DashboardHeader from '@/components/layout/DashboardHeader'
import OverviewContent from '@/app/dashboard/OverviewContent'
import Link from 'next/link'

export default async function ViewClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { dataConfig: true },
  })
  if (!client) notFound()

  return (
    <>
      <DashboardHeader title={`Viewing: ${client.name}`} />
      {/* Admin banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center justify-between">
        <p className="text-xs text-amber-700 font-medium">
          👁 Admin view — you are seeing this dashboard as <strong>{client.name}</strong>
        </p>
        <Link href="/admin" className="text-xs text-amber-700 hover:text-amber-900 underline">
          ← Back to admin
        </Link>
      </div>
      <OverviewContent clientId={client.id} isAdmin={true} />
    </>
  )
}
