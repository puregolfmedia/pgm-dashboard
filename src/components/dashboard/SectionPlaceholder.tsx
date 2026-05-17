interface SectionPlaceholderProps {
  title: string
  description?: string
  metrics: string[]
}

export default function SectionPlaceholder({ title, description, metrics }: SectionPlaceholderProps) {
  return (
    <div className="px-8 py-8">
      <h2 className="text-xl font-semibold text-pgm-ink mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}

      <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pgm-green/10 mb-4">
          <svg className="w-5 h-5 text-pgm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="font-medium text-pgm-ink mb-1">Coming soon — data connection in progress</h3>
        <p className="text-sm text-gray-400 mb-6">This section will show:</p>
        <ul className="inline-flex flex-col gap-1.5 text-sm text-gray-500 text-left">
          {metrics.map((m) => (
            <li key={m} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pgm-green/40 shrink-0" />
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
