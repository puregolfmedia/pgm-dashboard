import type { LandingPage } from '@/types/dashboard'

export default function TopLandingPagesTable({ data }: { data: LandingPage[] }) {
  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-medium text-pgm-ink">Top landing pages</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pgm-cream">
              <th className="text-left px-5 py-3 font-medium text-pgm-ink">Page</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Sessions</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Booking starts</th>
              <th className="text-right px-5 py-3 font-medium text-pgm-ink">Conv. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">No data available</td>
              </tr>
            )}
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-600 max-w-xs truncate" title={row.page}>
                  {row.page}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">
                  {new Intl.NumberFormat('en-GB').format(row.sessions)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-pgm-ink">
                  {new Intl.NumberFormat('en-GB').format(row.bookingStarts)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={row.conversionRate >= 5 ? 'text-pgm-green font-semibold' : 'text-pgm-ink'}>
                    {row.conversionRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
