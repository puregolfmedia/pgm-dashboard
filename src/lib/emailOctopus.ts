import axios from 'axios'
import { decrypt } from './crypto'

const BASE = 'https://emailoctopus.com/api/1.6'

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

export async function fetchEmailOctopusMetrics(
  encryptedApiKey: string,
  days = 30
): Promise<EmailMetrics> {
  const apiKey = decrypt(encryptedApiKey)
  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch recent campaigns
  const res = await axios.get(`${BASE}/campaigns`, {
    params: { api_key: apiKey, limit: 50, status: 'SENT' },
  })

  const allCampaigns: any[] = res.data?.data ?? []

  // Filter to the requested date window
  const campaigns = allCampaigns.filter((c: any) => {
    const sentAt = c.sent_at ? new Date(c.sent_at) : null
    return sentAt && sentAt >= since
  })

  if (campaigns.length === 0) {
    return { totalSent: 0, avgOpenRate: 0, avgClickRate: 0, avgBounceRate: 0, avgUnsubscribeRate: 0, campaigns: [] }
  }

  // Fetch report summaries for each campaign in parallel (max 10 to avoid hammering the API)
  const reports = await Promise.allSettled(
    campaigns.slice(0, 10).map((c: any) =>
      axios.get(`${BASE}/campaigns/${c.id}/reports/summary`, {
        params: { api_key: apiKey },
      })
    )
  )

  const summaries: EmailCampaignSummary[] = campaigns.slice(0, 10).map((c: any, i) => {
    const report = reports[i].status === 'fulfilled' ? reports[i].value.data : null
    const sent = report?.sent ?? 0
    const opened = report?.opens?.unique ?? 0
    const clicked = report?.clicks?.unique ?? 0
    const bounced = (report?.bounces?.hard ?? 0) + (report?.bounces?.soft ?? 0)
    const unsubscribed = report?.unsubscribed ?? 0

    return {
      id: c.id,
      name: c.name ?? c.subject ?? 'Untitled',
      sentAt: c.sent_at ?? '',
      sent,
      opened,
      clicked,
      bounced,
      unsubscribed,
      openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
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
