/** A titled part of the club's dashboard page, with a plain-English intro. */
export default function Section({ id, title, intro, children, aside }: {
  id: string
  title: string
  intro: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="space-y-5 scroll-mt-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 id={`${id}-title`} className="font-serif text-[26px] leading-tight font-semibold text-pgm-green">{title}</h2>
          <p className="text-[15px] text-gray-600 leading-relaxed mt-1.5">{intro}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
