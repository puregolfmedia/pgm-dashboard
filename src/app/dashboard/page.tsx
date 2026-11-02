import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ClubDashboard from './ClubDashboard'

export default async function DashboardPage({ searchParams }: { searchParams: { viewAs?: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as any
  const isAdmin = user.role === 'ADMIN'
  // Admins choose a club with ?viewAs=; club logins always see their own.
  const clientId = isAdmin ? (searchParams.viewAs ?? null) : user.clientId

  return (
    <ClubDashboard clientId={clientId} isAdmin={isAdmin} />
  )
}
