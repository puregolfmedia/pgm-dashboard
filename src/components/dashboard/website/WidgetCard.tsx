import type { ReactNode } from 'react'

/** The frame every website widget shares: a title, one line on what it shows, then the content. */
export default function WidgetCard({ title, intro, children, className = '' }: {
  title: string
  intro?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white border border-pgm-line rounded-xl p-4 sm:p-6 flex flex-col ${className}`}>
      <h3 className="text-[15px] font-semibold text-pgm-ink">{title}</h3>
      {intro && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{intro}</p>}
      <div className="mt-5 flex-1 flex flex-col">{children}</div>
    </div>
  )
}
