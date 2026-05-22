import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as any

  if (!session?.user || user.role !== 'ADMIN') redirect('/dashboard')

  const isCrmOwner = user.username === process.env.CRM_OWNER

  return (
    <div className="flex min-h-screen bg-[#F8F8F6]">
      <Sidebar isAdmin isCrmOwner={isCrmOwner} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
