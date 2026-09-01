import axios from 'axios'
import { decrypt } from './crypto'

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
  days = 30
): Promise<EmailMetrics> {
  const apiKey = decrypt(encryptedApiKey)
  const dc = datacenterFromApiKey(apiKey)
  const base = `https://${dc}.api.mailchimp.com/3.0`
  const auth = { username: 'anystring', password: apiKey }

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch recent sent campaigns for this audience
  const res = await axios.get(`${base}/campaigns`, {
    auth,
    params: {
      list_id: listId,
      status: 'sent',
      sort_field: 'send_time',
      sort_dir: 'DESC',
      count: 50,
      fields: 'campaigns.id,campaigns.settings.subject_line,campaigns.settings.title,campaigns.send_time,campaigns.emails_sent',
    },
  })

  const allCampaigns: any[] = res.data?.campaigns ?? []

  const campaigns = allCampaigns.filter((c: any) => {
    const sentAt = c.send_time ? new Date(c.send_time) : null
    return sentAt && sentAt >= since
  })

  if (campaigns.length === 0) {
    return { totalSent: 0, avgOpenRate: 0, avgClickRate: 0, avgBounceRate: 0, avgUnsubscribeRate: 0, campaigns: [] }
  }

  // Fetch the per-campaign report for detailed open/click/bounce/unsubscribe stats
  // (max 10 at a time to avoid hammering the API)
  const reports = await Promise.allSettled(
    campaigns.slice(0, 10).map((c: any) => axios.get(`${base}/reports/${c.id}`, { auth }))
  )

  const summaries: EmailCampaignSummary[] = campaigns.slice(0, 10).map((c: any, i) => {
    const report = reports[i].status === 'fulfilled' ? (reports[i] as PromiseFulfilledResult<any>).value.data : null

    const sent = report?.emails_sent ?? c.emails_sent ?? 0
    const opened = report?.opens?.unique_opens ?? 0
    const clicked = report?.clicks?.unique_subscriber_clicks ?? report?.clicks?.unique_clicks ?? 0
    const bounced = (report?.bounces?.hard_bounces ?? 0) + (report?.bounces?.soft_bounces ?? 0)
    const unsubscribed = report?.unsubscribed ?? 0

    // Mailchimp reports open_rate/click_rate as fractions (0–1) already net of hard bounces
    const openRate = report?.opens?.open_rate != null
      ? Math.round(report.opens.open_rate * 1000) / 10
      : sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0
    const clickRate = report?.clicks?.click_rate != null
      ? Math.round(report.clicks.click_rate * 1000) / 10
      : sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0

    return {
      id: c.id,
      name: c.settings?.subject_line || c.settings?.title || 'Untitled',
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
