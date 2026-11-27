import { prisma } from '@/lib/prisma'
import { encryptPII, decryptPII, lookupHash } from '@/lib/pii'
import type { EnquiryType, EnquiryStatus } from '@/generated/prisma/client'

// The CRM's one way in for new enquiries, plus helpers shared by its routes.

export const ENQUIRY_TYPES: { value: EnquiryType; label: string }[] = [
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'WEDDING', label: 'Wedding' },
  { value: 'SOCIETY', label: 'Society' },
  { value: 'DRIVING_RANGE', label: 'Driving range' },
  { value: 'FUNCTION', label: 'Function / party' },
  { value: 'GENERAL', label: 'General' },
]

export const STATUSES: EnquiryStatus[] = ['NEW', 'CONTACTED', 'TOUR_BOOKED', 'BOOKED', 'LOST']

/** "Joined" for membership, "Booked" for everything else. */
export function statusLabel(status: EnquiryStatus, type: EnquiryType): string {
  if (status === 'BOOKED') return type === 'MEMBERSHIP' ? 'Joined' : 'Booked'
  return { NEW: 'New', CONTACTED: 'Contacted', TOUR_BOOKED: type === 'MEMBERSHIP' ? 'Tour booked' : 'Viewing booked', LOST: 'Lost' }[status]
}

export const SOURCES = ['website_form', 'facebook_lead', 'instagram_lead', 'phone', 'walk_in', 'email', 'manual'] as const
export type Source = (typeof SOURCES)[number]

/** Best guess at the enquiry type from whatever the form or person said. */
export function inferType(...texts: (string | null | undefined)[]): EnquiryType {
  const t = texts.filter(Boolean).join(' ').toLowerCase()
  if (!t) return 'GENERAL'
  if (/\bmember|membership|join(ing)? the club/.test(t)) return 'MEMBERSHIP'
  if (/wedding|civil ceremony|reception/.test(t)) return 'WEDDING'
  if (/societ/.test(t)) return 'SOCIETY'
  if (/driving range|\brange\b|range balls/.test(t)) return 'DRIVING_RANGE'
  if (/christmas|festive|party|parties|function|private hire|celebration|birthday|wake|lunch|dinner|afternoon tea|event|venue|meeting/.test(t)) return 'FUNCTION'
  return 'GENERAL'
}

export function parseType(value: unknown): EnquiryType | null {
  return ENQUIRY_TYPES.some((t) => t.value === value) ? (value as EnquiryType) : null
}

export interface Actor { id: string | null; name: string | null }
export const SYSTEM: Actor = { id: null, name: null }

export interface NewEnquiry {
  clientId: string
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  type?: EnquiryType | null
  category?: string | null
  eventDate?: string | null
  source: Source
  sourceDetail?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  receivedAt?: Date
  /** Opt-in to marketing emails, with the wording they agreed to */
  marketingConsent?: boolean
  consentWording?: string | null
}

const clip = (v: string | null | undefined, n: number) => (v && v.trim() ? v.trim().slice(0, n) : null)

/** Find this person at this club (by email, then phone) or add them, keeping their details current. */
async function upsertContact(tx: any, input: NewEnquiry, fillOnly = false) {
  const name = clip(input.name, 200), email = clip(input.email, 320), phone = clip(input.phone, 50)
  const emailHash = lookupHash('email', email)
  const phoneHash = lookupHash('phone', phone)
  if (!emailHash && !phoneHash && !name) return null

  const now = new Date()
  const consent = input.marketingConsent
    ? { marketingConsent: true, consentAt: now, consentWording: clip(input.consentWording, 500) ?? 'Ticked the marketing opt-in on the enquiry form' }
    : {}

  const existing = emailHash
    ? await tx.contact.findUnique({ where: { clientId_emailHash: { clientId: input.clientId, emailHash } } })
    : phoneHash ? await tx.contact.findFirst({ where: { clientId: input.clientId, phoneHash, anonymisedAt: null } }) : null

  if (existing) {
    // fillOnly (older enquiries being moved across): only fill gaps, never replace newer details
    const fill = (have: string | null | undefined, v: string | null) => !!v && (!fillOnly || !have)
    return tx.contact.update({
      where: { id: existing.id },
      data: {
        // Newer details win; nothing already known is blanked
        ...(fill(existing.nameEnc, name) && { nameEnc: encryptPII(name) }),
        ...(fill(existing.emailEnc, email) && { emailEnc: encryptPII(email), emailHash }),
        ...(fill(existing.phoneEnc, phone) && { phoneEnc: encryptPII(phone), phoneHash }),
        ...consent,
        lastActivityAt: now,
        anonymisedAt: null,
      },
    })
  }
  return tx.contact.create({
    data: {
      clientId: input.clientId,
      nameEnc: encryptPII(name), emailEnc: encryptPII(email), phoneEnc: encryptPII(phone),
      emailHash, phoneHash, ...consent, lastActivityAt: now,
    },
  })
}

/** Record a new enquiry: the person, the enquiry and its first history entry, all together. */
export async function createEnquiry(input: NewEnquiry, actor: Actor = SYSTEM) {
  const type = input.type ?? inferType(input.category, input.message, input.sourceDetail)
  return prisma.$transaction(async (tx) => {
    const contact = await upsertContact(tx, input)
    const enquiry = await tx.enquiry.create({
      data: {
        clientId: input.clientId,
        contactId: contact?.id ?? null,
        receivedAt: input.receivedAt,
        type,
        source: input.source,
        sourceDetail: clip(input.sourceDetail, 200),
        utmSource: clip(input.utmSource, 100),
        utmMedium: clip(input.utmMedium, 100),
        utmCampaign: clip(input.utmCampaign, 200),
        category: clip(input.category, 100),
        eventDate: clip(input.eventDate, 100),
        messageEnc: encryptPII(clip(input.message, 5000)),
        stageChangedAt: input.receivedAt ?? new Date(),
      },
    })
    await tx.enquiryEvent.create({
      data: {
        enquiryId: enquiry.id, clientId: input.clientId, kind: 'created',
        actorUserId: actor.id, actorName: actor.name, toValue: 'NEW', detail: input.source,
      },
    })
    return enquiry
  })
}

/**
 * Move enquiries saved before the CRM (plain-text name, email, phone, message,
 * notes) into the encrypted fields, then clear the plain text. Safe to run any
 * number of times; it only touches rows that still have plain text.
 */
export async function secureLegacyEnquiries(clientId?: string): Promise<number> {
  const legacy = await prisma.enquiry.findMany({
    where: {
      ...(clientId && { clientId }),
      OR: [{ name: { not: null } }, { email: { not: null } }, { phone: { not: null } }, { message: { not: null } }, { staffNotes: { not: null } }],
    },
    take: 500,
  })
  let moved = 0
  for (const e of legacy) {
    try {
      await prisma.$transaction(async (tx) => {
        const contact = e.contactId
          ? await tx.contact.findUnique({ where: { id: e.contactId } })
          : await upsertContact(tx, { clientId: e.clientId, name: e.name, email: e.email, phone: e.phone, source: 'manual' }, true)

        // Anything from the original enquiry that the contact record doesn't hold
        // (e.g. a different phone number given back then) is kept in its notes
        const kept: string[] = []
        const differs = (enc: string | null | undefined, plain: string | null) => !!plain?.trim() && decryptPII(enc) !== plain.trim().slice(0, 320)
        if (differs(contact?.nameEnc, e.name)) kept.push(`name: ${e.name}`)
        if (differs(contact?.emailEnc, e.email)) kept.push(`email: ${e.email}`)
        if (differs(contact?.phoneEnc, e.phone)) kept.push(`phone: ${e.phone}`)
        const notes = [e.staffNotes ?? decryptPII(e.staffNotesEnc), kept.length ? `Details given on this enquiry — ${kept.join(', ')}` : null]
          .filter(Boolean).join('\n')

        const messageEnc = e.message ? encryptPII(e.message) : e.messageEnc
        const staffNotesEnc = notes ? encryptPII(notes) : e.staffNotesEnc
        // Check the encrypted copies read back exactly before the plain text goes
        if ((e.message && decryptPII(messageEnc) !== e.message) || (notes && decryptPII(staffNotesEnc) !== notes)) {
          throw new Error('encrypted copy did not read back identically')
        }

        await tx.enquiry.update({
          where: { id: e.id },
          data: {
            ...(contact && !e.contactId && { contactId: contact.id }),
            ...(e.type === 'GENERAL' && { type: inferType(e.category, e.message) }),
            messageEnc, staffNotesEnc,
            name: null, email: null, phone: null, message: null, staffNotes: null,
          },
        })
      })
      moved++
    } catch (err) {
      // Leave this one exactly as it was; it's tried again next time
      console.error('[crm] left enquiry unchanged', e.id, err)
    }
  }
  return moved
}

/** Log a change in an enquiry's history. */
export function logEvent(tx: any, e: { enquiryId: string; clientId: string }, actor: Actor, kind: string, fromValue?: string | null, toValue?: string | null, detail?: string | null) {
  return tx.enquiryEvent.create({
    data: { enquiryId: e.enquiryId, clientId: e.clientId, actorUserId: actor.id, actorName: actor.name, kind, fromValue: fromValue ?? null, toValue: toValue ?? null, detail: detail ?? null },
  })
}

/** An enquiry as the dashboard shows it, with personal details decrypted. */
export function toView(e: any) {
  const c = e.contact
  return {
    id: e.id,
    receivedAt: e.receivedAt,
    type: e.type as EnquiryType,
    source: e.source as string,
    sourceDetail: e.sourceDetail,
    utmSource: e.utmSource, utmMedium: e.utmMedium, utmCampaign: e.utmCampaign,
    category: e.category,
    eventDate: e.eventDate,
    status: e.status as EnquiryStatus,
    statusLabel: statusLabel(e.status, e.type),
    stageChangedAt: e.stageChangedAt,
    bookedValue: e.bookedValue,
    bookedAt: e.bookedAt,
    lostReason: e.lostReason,
    name: c ? decryptPII(c.nameEnc) : null,
    email: c ? decryptPII(c.emailEnc) : null,
    phone: c ? decryptPII(c.phoneEnc) : null,
    marketingConsent: c?.marketingConsent ?? false,
    contactId: e.contactId,
    message: decryptPII(e.messageEnc),
    staffNotes: decryptPII(e.staffNotesEnc),
    anonymised: !!e.anonymisedAt,
  }
}

/** Who is making a change, for the enquiry history. */
export async function actorFromSession(user: { id?: string; username?: string } | null | undefined): Promise<Actor> {
  if (!user?.id) return SYSTEM
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true, username: true } })
  return { id: user.id, name: u?.displayName || u?.username || user.username || null }
}
