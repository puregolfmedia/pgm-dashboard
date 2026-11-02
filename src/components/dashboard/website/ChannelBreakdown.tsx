import { channelName } from '@/lib/channels'
import WidgetCard from './WidgetCard'

const nf = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n))

/** Where visits came from, how big a share each channel is, and which ones turn into enquiries. */
export default function ChannelBreakdown({ data, label, className }: {
  className?: string
  data: { channel: string; sessions: number; enquiries: number }[]
  /** What the club's website action is called, e.g. "Christmas enquiries" */
  label: string
}) {
  const phrase = label === 'Booking starts' ? 'booking starts' : label
  const total = data.reduce((s, d) => s + d.sessions, 0)
  const max = Math.max(1, ...data.map((d) => d.sessions))
  const best = data.filter((d) => d.sessions >= 30 && d.enquiries > 0)
    .sort((a, b) => b.enquiries / b.sessions - a.enquiries / a.sessions)[0]

  return (
    <WidgetCard className={className} title="Where visitors came from"
      intro={`Each channel’s visits, its share of all visits, and how many ${phrase} it led to.`}>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No visits recorded for these dates yet</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="text-left font-normal pb-2 px-1">Channel</th>
                  <th className="text-left font-normal pb-2 px-1 w-[36%]">Share of visits</th>
                  <th className="text-right font-normal pb-2 px-1">Visits</th>
                  <th className="text-right font-normal pb-2 px-1">{label}</th>
                  <th className="text-right font-normal pb-2 px-1">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => {
                  const share = total ? (d.sessions / total) * 100 : 0
                  const rate = d.sessions ? (d.enquiries / d.sessions) * 100 : 0
                  return (
                    <tr key={d.channel} className="border-t border-pgm-line/70">
                      <td className="py-2.5 px-1 text-pgm-ink whitespace-nowrap">{channelName(d.channel)}</td>
                      <td className="py-2.5 px-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-pgm-cream rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(d.sessions / max) * 100}%`, background: i === 0 ? '#084724' : '#7FA58C' }} />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums w-9 text-right">{Math.round(share)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-1 text-right tabular-nums text-pgm-ink">{nf(d.sessions)}</td>
                      <td className="py-2.5 px-1 text-right tabular-nums text-pgm-ink">{nf(d.enquiries)}</td>
                      <td className={`py-2.5 px-1 text-right tabular-nums ${best && d.channel === best.channel ? 'text-pgm-green font-semibold' : 'text-gray-600'}`}>
                        {rate.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {best && (
            <p className="text-xs text-gray-600 mt-4 pt-4 border-t border-pgm-line">
              <span className="font-semibold text-pgm-green">{channelName(best.channel)}</span> turned visits into {phrase} best:
              {' '}{((best.enquiries / best.sessions) * 100).toFixed(1)}% of its visits led to one.
            </p>
          )}
        </>
      )}
    </WidgetCard>
  )
}
