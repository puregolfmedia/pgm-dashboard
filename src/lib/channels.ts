// Google Analytics' channel names, in everyday words
export const CHANNEL_NAMES: Record<string, string> = {
  'Organic Search': 'Google search',
  'Direct': 'Typed in or bookmarked',
  'Paid Social': 'Facebook & Instagram ads',
  'Organic Social': 'Social media posts',
  'Paid Search': 'Google ads',
  'Email': 'Emails',
  'Referral': 'Other websites',
  'Organic Video': 'YouTube and video',
  'Organic Shopping': 'Google Shopping',
  'Display': 'Display ads',
  'Unassigned': 'Unknown',
}

export const channelName = (c: string) => CHANNEL_NAMES[c] ?? c
