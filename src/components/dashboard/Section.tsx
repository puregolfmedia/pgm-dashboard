import Icon from '@/components/ui/Icon'

/** A titled part of the club's dashboard page, with a plain-English intro. */
export default function Section({ id, title, intro, children, aside, tinted = false, icon }: {
  id: string
  icon?: string
  /** Sit on a pale green band, so neighbouring sections are easy to tell apart */
  tinted?: boolean
  title: string
  intro: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`}
      className={`space-y-5 scroll-mt-6 ${tinted
        ? 'bg-[#E4EDE6] border border-[#CFDDD3] rounded-2xl px-4 py-6 sm:p-8'
        : 'border-t-2 border-pgm-green/15 pt-10'}`}
      style={tinted ? { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } : undefined}>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 id={`${id}-title`} className="flex items-center gap-3 font-serif text-[26px] leading-tight font-semibold text-pgm-green">
            {icon && (
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tinted ? 'bg-white' : 'bg-[#E4EDE6]'}`}>
                <Icon name={icon} className="w-5 h-5" />
              </span>
            )}
            {title}
          </h2>
          <p className="text-[15px] text-gray-600 leading-relaxed mt-1.5">{intro}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
