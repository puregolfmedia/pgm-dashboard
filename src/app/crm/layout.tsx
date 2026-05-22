import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.username !== process.env.CRM_OWNER) redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-[#F8F8F6]">
      <Sidebar isAdmin isCrmOwner />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
