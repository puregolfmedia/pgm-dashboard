import { prisma } from '@/lib/prisma'
import DashboardHeader from '@/components/layout/DashboardHeader'
import Link from 'next/link'

export default async function AdminPage() {
  const clients = await prisma.client.findMany({
    include: {
      dataConfig: true,
      users: { where: { role: 'CLIENT' }, orderBy: { lastLoginAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <>
      <DashboardHeader title="Clients" />
      <div className="px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          <Link
            href="/admin/clients/new"
            className="bg-pgm-green hover:bg-pgm-green/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New client
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pgm-cream border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-pgm-ink">Client</th>
                <th className="text-left px-5 py-3 font-medium text-pgm-ink">GA4</th>
                <th className="text-left px-5 py-3 font-medium text-pgm-ink">Meta</th>
                <th className="text-left px-5 py-3 font-medium text-pgm-ink">Last login</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    No clients yet. Create your first one.
                  </td>
                </tr>
              )}
              {clients.map((client) => {
                const lastLogin = client.users[0]?.lastLoginAt
                return (
                  <tr key={client.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-pgm-ink">{client.name}</td>
                    <td className="px-5 py-3.5">
                      {client.dataConfig?.ga4PropertyId ? (
                        <span className="text-pgm-green font-medium">✓ Connected</span>
                      ) : (
                        <span className="text-gray-400">✗ Not configured</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {client.dataConfig?.metaAdAccountId ? (
                        <span className="text-pgm-green font-medium">✓ Connected</span>
                      ) : (
                        <span className="text-gray-400">✗ Not configured</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {lastLogin
                        ? new Date(lastLogin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/clients/${client.id}`} className="text-pgm-green hover:underline">
                          Edit
                        </Link>
                        <Link href={`/admin/clients/${client.id}/view`} className="text-gray-500 hover:text-pgm-ink hover:underline">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
