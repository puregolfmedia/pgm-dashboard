import type { EnquiryType } from '@/generated/prisma/client'

// The hosted enquiry forms: /enquire/<club slug>/<form slug>. Every club gets the
// same set; admin picks which ones a club offers. Shared by the public page, its
// API route and the admin card, so the questions asked and the answers stored match.

export interface FormField {
  name: string
  label: string
  kind: 'text' | 'date' | 'number' | 'select' | 'textarea'
  required?: boolean
  options?: string[]
  placeholder?: string
  /** Stored as the enquiry's event date / category rather than in the message */
  storeAs?: 'eventDate' | 'category'
}

export interface EnquiryForm {
  slug: string
  type: EnquiryType
  title: string
  /** Shown under the title; {club} becomes the club's name */
  intro: string
  fields: FormField[]
}

const message = (label: string, required = false): FormField => ({ name: 'message', label, kind: 'textarea', required })

export const ENQUIRY_FORMS: EnquiryForm[] = [
  {
    slug: 'membership', type: 'MEMBERSHIP', title: 'Membership enquiry',
    intro: 'Tell us a little about your golf and the team at {club} will be in touch about membership.',
    fields: [
      { name: 'handicap', label: 'Do you have a handicap?', kind: 'select', options: ['Yes', 'Working towards one', 'No, I’m new to golf'] },
      message('Anything you’d like to know? (optional)'),
    ],
  },
  {
    slug: 'wedding', type: 'WEDDING', title: 'Wedding enquiry',
    intro: 'Share your plans and the team at {club} will come back to you with availability and details.',
    fields: [
      { name: 'preferred_date', label: 'Preferred date (if you have one)', kind: 'date', storeAs: 'eventDate' },
      { name: 'guests', label: 'Roughly how many guests?', kind: 'number' },
      message('Tell us about your day (optional)'),
    ],
  },
  {
    slug: 'society', type: 'SOCIETY', title: 'Society day enquiry',
    intro: 'Tell us about your society day and the team at {club} will come back to you with availability and prices.',
    fields: [
      { name: 'society_name', label: 'Society name', kind: 'text' },
      { name: 'preferred_date', label: 'Preferred date (if you have one)', kind: 'date', storeAs: 'eventDate' },
      { name: 'golfers', label: 'Roughly how many golfers?', kind: 'number' },
      message('Anything else, such as food or extras? (optional)'),
    ],
  },
  {
    slug: 'function', type: 'FUNCTION', title: 'Party and function enquiry',
    intro: 'Planning a party, celebration or meeting at {club}? Tell us what you have in mind.',
    fields: [
      { name: 'occasion', label: 'What’s the occasion?', kind: 'select', storeAs: 'category',
        options: ['Birthday or celebration', 'Christmas party', 'Wake', 'Business or meeting', 'Something else'] },
      { name: 'preferred_date', label: 'Preferred date (if you have one)', kind: 'date', storeAs: 'eventDate' },
      { name: 'guests', label: 'Roughly how many guests?', kind: 'number' },
      message('Tell us more (optional)'),
    ],
  },
  {
    slug: 'driving-range', type: 'DRIVING_RANGE', title: 'Driving range enquiry',
    intro: 'Questions about the driving range at {club}? Send them over.',
    fields: [message('Your question', true)],
  },
  {
    slug: 'general', type: 'GENERAL', title: 'Get in touch',
    intro: 'Send a message to the team at {club}.',
    fields: [message('Your message', true)],
  },
]

export const formBySlug = (slug: string) => ENQUIRY_FORMS.find((f) => f.slug === slug) ?? null

/** The opt-in wording shown beside the tick box, stored with the consent exactly as shown. */
export const consentWording = (club: string) =>
  `Yes, I’d like to hear about news and offers from ${club} by email. I can unsubscribe at any time.`

export const intro = (form: EnquiryForm, club: string) => form.intro.replace('{club}', club)
