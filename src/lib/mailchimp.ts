import axios from 'axios'
import { decrypt } from './crypto'
import { toRange, type DateRange } from './dateRange'

export interface EmailCampaignSummary {
  id: string
  name: string
  sentAt: string
  sent: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  openRate: number
  clickRate: number
  /** Present when the email was a Mailchimp A/B test */
  abTest?: ABTest
}

export interface ABVariant {
  /** "A", "B", "C"… */
  label: string
  /** What made this version different, e.g. its subject line */
  description: string
  recipients: number | null
  openRate: number | null
  clickRate: number | null
  winner: boolean
}

export interface ABTest {
  /** What was tested, in plain words, e.g. "Subject line" */
  tested: string
  /** How the winner was picked: "opens" | "clicks" | "total_revenue" | "manual" */
  winnerCriteria: string | null
  /** % of the list that got the test versions */
  testSize: number | null
  /** Hours Mailchimp waited before picking the winner */
  waitHours: number | null
  variants: ABVariant[]
}

export interface EmailMetrics {
  totalSent: number
  avgOpenRate: number
  avgClickRate: number
  avgBounceRate: number
  avgUnsubscribeRate: number
  campaigns: EmailCampaignSummary[]
}

// A Mailchimp API key is formatted as <key>-<datacenter>, e.g. "abc123def456-us21".
// The datacenter prefix must be used in the API host.
function datacenterFromApiKey(apiKey: string): string {
  const dc = apiKey.split('-').pop()
  if (!dc) throw new Error('Malformed Mailchimp API key — expected a "-<datacenter>" suffix (e.g. "-us21")')
  return dc
}

export async function fetchMailchimpMetrics(
  encryptedApiKey: string,
  listId: string,
  days: number | DateRange = 30
): Promise<EmailMetrics> {
  const apiKey = decrypt(encryptedApiKey)
  const dc = datacenterFromApiKey(apiKey)
  const base = `https://${dc}.api.mailchimp.com/3.0`
  const auth = { username: 'anystring', password: apiKey }

  const range = toRange(days)
  const since = new Date(`${range.start}T00:00:00Z`)
  const until = new Date(`${range.end}T23:59:59Z`)

  // Fetch recent sent campaigns for this audience
  const res = await axios.get(`${base}/campaigns`, {
    auth,
    params: {
      list_id: listId,
      status: 'sent',
      sort_field: 'send_time',
      sort_dir: 'DESC',
      count: 50,
      fields: 'campaigns.id,campaigns.type,campaigns.settings.subject_line,campaigns.settings.title,campaigns.send_time,campaigns.emails_sent,campaigns.variate_settings',
    },
  })

  const allCampaigns: any[] = res.data?.campaigns ?? []

  const campaigns = allCampaigns.filter((c: any) => {
    const sentAt = c.send_time ? new Date(c.send_time) : null
    return sentAt && sentAt >= since && sentAt <= until
  })

  if (campaigns.length === 0) {
    return { totalSent: 0, avgOpenRate: 0, avgClickRate: 0, avgBounceRate: 0, avgUnsubscribeRate: 0, campaigns: [] }
  }

  // Fetch the per-campaign report for detailed open/click/bounce/unsubscribe stats
  // (up to 50, which covers months of sends)
  const reports = await Promise.allSettled(
    campaigns.slice(0, 50).map((c: any) => axios.get(`${base}/reports/${c.id}`, { auth }))
  )
  // A/B tests: each version's own results live in the test's child reports
  const subReports = await Promise.allSettled(
    campaigns.slice(0, 50).map((c: any) => c.type === 'variate'
      ? axios.get(`${base}/reports/${c.id}/sub-reports`, { auth })
      : Promise.resolve(null))
  )

  const summaries: EmailCampaignSummary[] = campaigns.slice(0, 50).map((c: any, i) => {
    const report = reports[i].status === 'fulfilled' ? (reports[i] as PromiseFulfilledResult<any>).value.data : null

    const sent = report?.emails_sent ?? c.emails_sent ?? 0
    // Apple Mail "opens" every email automatically (Mail Privacy Protection),
    // which inflates opens. Use Mailchimp's figures with those excluded — the
    // same open rate Mailchimp shows in its own reports — when available.
    const opened = report?.opens?.proxy_excluded_unique_opens ?? report?.opens?.unique_opens ?? 0
    const clicked = report?.clicks?.unique_subscriber_clicks ?? report?.clicks?.unique_clicks ?? 0
    const bounced = (report?.bounces?.hard_bounces ?? 0) + (report?.bounces?.soft_bounces ?? 0)
    const unsubscribed = report?.unsubscribed ?? 0

    // Mailchimp reports open_rate/click_rate as fractions (0–1) already net of hard bounces
    const rate = report?.opens?.proxy_excluded_open_rate ?? report?.opens?.open_rate
    const openRate = rate != null
      ? Math.round(rate * 1000) / 10
      : sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0
    const clickRate = report?.clicks?.click_rate != null
      ? Math.round(report.clicks.click_rate * 1000) / 10
      : sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0

    const children = subReports[i].status === 'fulfilled' ? (subReports[i] as PromiseFulfilledResult<any>).value?.data?.reports ?? [] : []
    const abTest = c.type === 'variate' && c.variate_settings ? buildABTest(c.variate_settings, report, children) : undefined
    const winnerSubject = abTest?.tested === 'Subject line' ? abTest.variants.find((v) => v.winner)?.description : undefined

    return {
      id: c.id,
      name: c.settings?.subject_line || winnerSubject || c.variate_settings?.subject_lines?.[0] || c.settings?.title || 'Untitled',
      abTest,
      sentAt: c.send_time ?? '',
      sent,
      opened,
      clicked,
      bounced,
      unsubscribed,
      openRate,
      clickRate,
    }
  })

  const totalSent = summaries.reduce((s, c) => s + c.sent, 0)
  const avg = (fn: (c: EmailCampaignSummary) => number) =>
    summaries.length > 0 ? Math.round(summaries.reduce((s, c) => s + fn(c), 0) / summaries.length * 10) / 10 : 0

  return {
    totalSent,
    avgOpenRate: avg((c) => c.openRate),
    avgClickRate: avg((c) => c.clickRate),
    avgBounceRate: avg((c) => c.sent > 0 ? (c.bounced / c.sent) * 100 : 0),
    avgUnsubscribeRate: avg((c) => c.sent > 0 ? (c.unsubscribed / c.sent) * 100 : 0),
    campaigns: summaries,
  }
}

const pct = (fraction: number | null | undefined) => (fraction == null ? null : Math.round(fraction * 1000) / 10)

/** Turn Mailchimp's A/B ("variate") settings and reports into versions A, B, C… with their results. */
export function buildABTest(v: any, parentReport: any, children: any[]): ABTest {
  // Which settings had more than one option is what was tested
  const lists: [string, string, string[]][] = [
    ['Subject line', 'subject_line', v.subject_lines ?? []],
    ['From name', 'from_name', v.from_names ?? []],
    ['Email content', 'content_description', v.contents ?? []],
    ['Send time', 'send_time', v.send_times ?? []],
  ]
  const tested = lists.filter(([, , opts]) => opts.length > 1)
  const testedLabel = tested.map(([name]) => name).join(' and ') || 'Versions'

  const combos: any[] = v.combinations ?? []
  // A combination refers to each option by its position in the list above
  const describe = (combo: any) => tested.map(([, key, opts]) => {
    const ref = combo?.[key]
    return typeof ref === 'number' ? opts[ref] ?? '' : String(ref ?? '')
  }).filter(Boolean).join(' · ')

  // Child reports for the test versions (not the follow-up send to everyone else)
  const testChildren = children.filter((r) => r?.id !== v.winning_campaign_id)
  const abSplit = parentReport?.ab_split

  const variants: ABVariant[] = combos.map((combo, i) => {
    const description = describe(combo)
    const child = testChildren.find((r) => description && (r.subject_line === description || r.campaign_title === description))
      ?? (testChildren.length === combos.length ? testChildren[i] : undefined)
    const recipients = child?.emails_sent ?? combo.recipients ?? null
    let openRate: number | null = null
    let clickRate: number | null = null
    if (child) {
      openRate = pct(child.opens?.proxy_excluded_open_rate ?? child.opens?.open_rate)
      clickRate = pct(child.clicks?.click_rate)
    } else if (abSplit && combos.length === 2 && recipients) {
      // Older two-way tests report counts per version instead
      const side = abSplit[i === 0 ? 'a' : 'b']
      if (side) {
        openRate = Math.round((side.unique_opens / recipients) * 1000) / 10
        clickRate = Math.round((side.recipient_clicks / recipients) * 1000) / 10
      }
    }
    return {
      label: String.fromCharCode(65 + i),
      description: description || `Version ${String.fromCharCode(65 + i)}`,
      recipients,
      openRate,
      clickRate,
      winner: !!v.winning_combination_id && combo.id === v.winning_combination_id,
    }
  })

  return {
    tested: testedLabel,
    winnerCriteria: v.winner_criteria ?? null,
    testSize: v.test_size ?? null,
    waitHours: v.wait_time ? Math.round(v.wait_time / 60) : null,
    variants,
  }
}
