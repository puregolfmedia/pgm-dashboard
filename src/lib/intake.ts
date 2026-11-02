// Reading enquiries out of whatever shape a website form sends.

/** Flatten nested payloads ({ form_data: {...} }, { data: {...} }) into one level of string fields. */
export function flatten(input: unknown, out: Record<string, string> = {}): Record<string, string> {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out)
      else if (v !== null && v !== undefined && String(v).trim() !== '') {
        out[k] = Array.isArray(v) ? v.join(', ') : String(v).trim()
      }
    }
  }
  return out
}

const clip = (s: string | undefined, n: number) => (s ? s.slice(0, n) : null)

/** Pick out the usual enquiry fields whatever the form calls them; everything else goes into the message. */
export function parseEnquiry(fields: Record<string, string>) {
  const used = new Set<string>()
  const find = (test: (key: string) => boolean) => {
    const key = Object.keys(fields).find((k) => !used.has(k) && test(k.toLowerCase().replace(/[\s-]/g, '_')))
    if (key) used.add(key)
    return key ? fields[key] : undefined
  }

  const first = find((k) => ['first_name', 'firstname', 'forename'].includes(k))
  const last = find((k) => ['last_name', 'lastname', 'surname'].includes(k))
  const name = find((k) => ['name', 'full_name', 'fullname', 'your_name', 'contact_name'].includes(k))
    ?? ([first, last].filter(Boolean).join(' ') || undefined)
  const email = find((k) => k.includes('email'))
  const phone = find((k) => k.includes('phone') || k.includes('mobile') || k === 'tel' || k.includes('telephone'))
  const category = find((k) => ['category', 'enquiry_type', 'type', 'package', 'event_type', 'interest'].includes(k))
  const eventDate = find((k) => k.includes('date'))
  const message = find((k) => ['message', 'details', 'comments', 'notes', 'enquiry', 'description'].includes(k))

  // Keep any other answers (party size, budget…) so nothing the person wrote is lost
  const extras = Object.entries(fields)
    .filter(([k]) => !used.has(k) && !k.startsWith('_'))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)

  return {
    name: clip(name, 200),
    email: clip(email, 320),
    phone: clip(phone, 50),
    category: clip(category, 100),
    eventDate: clip(eventDate, 100),
    message: clip([message, ...extras].filter(Boolean).join('\n'), 5000),
  }
}
