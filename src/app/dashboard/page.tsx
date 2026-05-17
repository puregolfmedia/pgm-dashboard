import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardHeader from '@/components/layout/DashboardHeader'
import OverviewContent from './OverviewContent'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as any

  return (
    <>
      <DashboardHeader title="Overview" />
      <OverviewContent clientId={user.clientId} isAdmin={user.role === 'ADMIN'} />
    </>
  )
}
