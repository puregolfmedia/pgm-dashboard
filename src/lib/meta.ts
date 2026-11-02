import axios from 'axios'
import { decrypt } from './crypto'
import { toRange, type DateRange } from './dateRange'

const META_API_VERSION = 'v19.0'
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

interface MetaInsights {
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  cpc: number
  roas: number | null
}

interface MetaInsightsPair {
  current: MetaInsights
  previous: MetaInsights
}

interface MetaCampaign {
  name: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  roas: number | null
}

function parseInsights(data: any): MetaInsights {
  const row = Array.isArray(data) ? data[0] : null
  if (!row) {
    return { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpm: 0, cpc: 0, roas: null }
  }
  const roas = row.purchase_roas?.[0]?.value
  return {
    spend: parseFloat(row.spend ?? '0'),
    impressions: parseInt(row.impressions ?? '0'),
    clicks: parseInt(row.clicks ?? '0'),
    ctr: parseFloat(row.ctr ?? '0'),
    cpm: parseFloat(row.cpm ?? '0'),
    cpc: parseFloat(row.cost_per_unique_click ?? '0'),
    roas: roas ? parseFloat(roas) : null,
  }
}

export async function fetchMetaOverview(
  adAccountId: string,
  encryptedToken: string,
  days: number | DateRange = 30
): Promise<MetaInsightsPair> {
  const token = decrypt(encryptedToken)
  const fields = 'spend,impressions,clicks,ctr,cpm,cost_per_unique_click,purchase_roas'

  const [currentRes, previousRes] = await Promise.all([
    axios.get(`${BASE_URL}/act_${adAccountId}/insights`, {
      params: { access_token: token, fields, time_range: JSON.stringify({ since: toRange(days).start, until: toRange(days).end }), level: 'account' },
    }),
    axios.get(`${BASE_URL}/act_${adAccountId}/insights`, {
      params: { access_token: token, fields, time_range: JSON.stringify({ since: toRange(days).prevStart, until: toRange(days).prevEnd }), level: 'account' },
    }),
  ])

  return {
    current: parseInsights(currentRes.data.data),
    previous: parseInsights(previousRes.data.data),
  }
}

export async function fetchMetaCampaigns(
  adAccountId: string,
  encryptedToken: string,
  days: number | DateRange = 30
): Promise<MetaCampaign[]> {
  const token = decrypt(encryptedToken)
  const fields = 'campaign_name,spend,impressions,clicks,ctr,purchase_roas'
  const { start: since, end: until } = toRange(days)

  const res = await axios.get(`${BASE_URL}/act_${adAccountId}/insights`, {
    params: {
      access_token: token,
      fields,
      time_range: JSON.stringify({ since, until }),
      level: 'campaign',
      sort: 'spend_descending',
      limit: 10,
    },
  })

  return (res.data.data ?? []).map((row: any) => ({
    name: row.campaign_name,
    spend: parseFloat(row.spend ?? '0'),
    impressions: parseInt(row.impressions ?? '0'),
    clicks: parseInt(row.clicks ?? '0'),
    ctr: parseFloat(row.ctr ?? '0'),
    roas: row.purchase_roas?.[0]?.value ? parseFloat(row.purchase_roas[0].value) : null,
  }))
}
