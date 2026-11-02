/** A titled part of the club's single dashboard page, with a plain-English intro. */
export default function Section({ id, title, intro, children, aside }: {
  id: string
  title: string
  intro: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="space-y-4 scroll-mt-6 break-inside-avoid-page">
      <div className="flex items-end justify-between gap-3 flex-wrap border-b border-gray-200 pb-2">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold text-pgm-ink">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5 max-w-3xl">{intro}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
