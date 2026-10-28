import DashboardHeader from '@/components/layout/DashboardHeader'
import Link from 'next/link'
import AllClientsOverview from '@/components/admin/AllClientsOverview'
import PasswordHelpRequests from '@/components/admin/PasswordHelpRequests'

export default function AdminPage() {
  return (
    <>
      <DashboardHeader title="Clients" />
      <div className="px-4 sm:px-8 py-8 space-y-4 max-w-5xl">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <p className="text-sm text-gray-500 max-w-xl">
            Every club at a glance. Tracking is checked automatically — a club is flagged if website visits or its key
            action suddenly drop, a connection fails, or form enquiries stop arriving.
          </p>
          <Link href="/admin/clients/new"
            className="bg-pgm-green hover:bg-pgm-green/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0">
            + New client
          </Link>
        </div>
        <PasswordHelpRequests />
        <AllClientsOverview />
      </div>
    </>
  )
}
