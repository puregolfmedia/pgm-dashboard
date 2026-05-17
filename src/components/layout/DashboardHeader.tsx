interface DashboardHeaderProps {
  title: string
  clientName?: string
  lastUpdated?: string | null
}

export default function DashboardHeader({ title, clientName, lastUpdated }: DashboardHeaderProps) {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
      <div>
        <h1 className="text-xl font-semibold text-pgm-ink">{title}</h1>
        {clientName && (
          <p className="text-sm text-gray-400 mt-0.5">{clientName}</p>
        )}
      </div>
      {formattedTime && (
        <p className="text-xs text-gray-400">
          Last updated: Today {formattedTime}
        </p>
      )}
    </div>
  )
}
