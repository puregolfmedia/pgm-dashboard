import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EnquiriesPipeline from './EnquiriesPipeline'

export default async function EnquiriesPage({ searchParams }: { searchParams: { viewAs?: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as any
  const isAdmin = user.role === 'ADMIN'
  // Admins choose a club with ?viewAs=; club logins always see their own.
  const clientId = isAdmin ? (searchParams.viewAs ?? null) : user.clientId

  return <EnquiriesPipeline clientId={clientId} isAdmin={isAdmin} />
}
