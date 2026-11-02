import WidgetCard from './WidgetCard'

const NAMES: Record<string, string> = { mobile: 'Mobile phones', desktop: 'Computers', tablet: 'Tablets', smart_tv: 'Smart TVs' }
const COLOURS = ['#084724', '#B8913A', '#7FA58C', '#C9D3CC']
const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))

/** Which devices people used — one stacked bar plus a key with the share of visits. */
export default function DeviceBreakdown({ data }: { data: { device: string; sessions: number }[] }) {
  const total = data.reduce((s, d) => s + d.sessions, 0)
  const rows = data.filter((d) => d.sessions > 0).map((d, i) => ({
    name: NAMES[d.device] ?? d.device.charAt(0).toUpperCase() + d.device.slice(1),
    sessions: d.sessions,
    share: total ? (d.sessions / total) * 100 : 0,
    colour: COLOURS[i] ?? COLOURS[COLOURS.length - 1],
  }))
  const top = rows[0]

  return (
    <WidgetCard title="Devices" intro="What people used to visit the website. Check pages look right on whichever device leads.">
      {total === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No visits recorded for these dates yet</p>
      ) : (
        <>
          <p className="text-[40px] leading-none font-semibold text-pgm-ink tabular-nums tracking-tight">{Math.round(top.share)}%</p>
          <p className="text-xs text-gray-500 mt-2">of visits were on {top.name.toLowerCase()}</p>

          <div className="flex h-3 rounded-full overflow-hidden mt-6 gap-[2px]" role="img"
            aria-label={rows.map((r) => `${r.name} ${Math.round(r.share)}%`).join(', ')}>
            {rows.map((r) => <div key={r.name} style={{ width: `${r.share}%`, background: r.colour }} />)}
          </div>

          <ul className="space-y-3 mt-6">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.colour }} aria-hidden />
                <span className="text-pgm-ink flex-1">{r.name}</span>
                <span className="text-gray-500 tabular-nums text-xs">{nf(r.sessions)} visits</span>
                <span className="text-pgm-ink font-semibold tabular-nums w-11 text-right">{Math.round(r.share)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </WidgetCard>
  )
}
