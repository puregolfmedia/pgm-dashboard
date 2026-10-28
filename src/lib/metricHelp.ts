// Plain-English explanations shown on the dashboard, so every number and
// chart says what it means. Keyed by the label/title used on screen.

export const metricHelp: Record<string, string> = {
  // Overview
  'Sessions': 'Visits to your website. One person visiting twice counts as two.',
  'Booking starts': 'Times a visitor clicked to book or enquire — the key action tracked for your club.',
  'Cost / booking start': 'Ad spend divided by booking starts: what each one cost in advertising.',
  'CTR': 'Click-through rate: the % of people who saw an ad and clicked it.',
  'Ad spend': 'Total spent on Meta (Facebook & Instagram) ads in this period.',
  'ROAS': 'Return on ad spend: revenue tracked from ads for every £1 spent (e.g. 3x = £3 back per £1).',

  'Enquiries received': 'Enquiries logged in the dashboard — from your website forms automatically, plus any added by hand.',
  'Enquiries booked': 'Enquiries marked as booked, and what % of all enquiries that is.',
  'Booked revenue': 'Total value of enquiries marked as booked.',

  // Visitors
  'Total users': 'Different people who visited your website.',
  'New users': 'People visiting your website for the first time.',
  'Bounce rate': 'The % of visits where someone didn’t engage: left within 10 seconds, saw one page and took no key action.',
  'Avg. session duration': 'How long a typical visit lasts.',

  // Membership
  'Membership enquiries': 'Times someone sent a membership enquiry from your website.',
  'Enquiry rate': 'The % of visits that led to a membership enquiry.',

  // Email
  'Emails sent': 'Total emails delivered across the campaigns below.',
  'Avg. open rate': 'The % of recipients who opened an email. Golf clubs typically see 30–40%.',
  'Avg. click rate': 'The % of recipients who clicked a link in an email.',
  'Avg. unsubscribe rate': 'The % of recipients who unsubscribed. Under 0.5% is healthy.',

  // Paid social
  'Impressions': 'How many times your ads or listings were shown.',
  'Clicks': 'How many times people clicked your ads.',
  'CPM': 'Cost per 1,000 impressions: the price of showing your ads 1,000 times.',

  // Google Search
  'Clicks from Google': 'Times someone clicked through to your website from Google search results.',
  'Click-through rate': 'The % of people who saw your website in Google and clicked it.',
  'Avg. position': 'Your average ranking in Google results. 1 is the top; 1–10 is page one.',
}

// The search-page "Impressions" card means Google listings, not ads.
export const searchImpressionsHelp = 'Times your website appeared in someone’s Google search results.'

export const sectionHelp: Record<string, string> = {
  'Booking starts by day': 'Booking starts each day, so you can spot busy days and the effect of campaigns.',
  'Traffic source': 'Where your website visits came from — e.g. Google, social media, typing your address directly.',
  'Top landing pages': 'The first page people arrived on, how many went on to start a booking, and the conversion % (booking starts ÷ sessions).',
  'Device breakdown': 'Whether visitors used a phone, computer or tablet.',
  'Channel breakdown': 'Where your visitors came from, by number of people.',
  'Campaigns': 'Each email sent in this period and how it performed.',
  'Campaign breakdown': 'Each ad campaign and how it performed.',
  'Top search terms': 'What people typed into Google before seeing or clicking your website.',
  'Top pages in Google': 'Which pages of your website appear in Google, and how they perform.',
}

export const pageHelp: Record<string, string> = {
  'Overview': 'Your headline numbers at a glance. Arrows compare with the previous period of the same length.',
  'Visitors': 'Who is visiting your website and how they behave.',
  'Membership': 'Interest in membership generated through your website.',
  'Enquiries': 'Every enquiry from your website forms, plus ones added by hand, and which turned into bookings.',
  'Email': 'How your email campaigns performed.',
  'Paid Social': 'How your Facebook & Instagram ads performed.',
  'Pages': 'Which pages bring people in and lead to bookings.',
  'UTMs': 'Visits from tracked links (e.g. in emails or ads), so you can see which specific campaign brought people in.',
  'Google Search': 'How your website performs in Google search results (not ads).',
  'Monthly report': 'A plain-English summary of the month, ready to print or save as a PDF.',
}
