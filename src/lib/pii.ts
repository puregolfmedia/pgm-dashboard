import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

// Personal details (names, emails, phone numbers, messages, staff notes) are
// encrypted here before they reach the database, with their own keys, separate
// from ENCRYPTION_KEY (which protects API keys):
//   PII_ENCRYPTION_KEY – 64 hex characters (32 bytes), AES-256-GCM
//   PII_HASH_KEY       – 64 hex characters, HMAC-SHA256 for lookup hashes
// Never change either key once data exists: what was encrypted with the old key
// can no longer be read, and the hashes stop matching.

const ALGORITHM = 'aes-256-gcm'
const PREFIX = 'p1:' // marks the format, so it can change later without guessing

function key(name: 'PII_ENCRYPTION_KEY' | 'PII_HASH_KEY'): Buffer {
  const hex = process.env[name]
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${name} is missing or not 64 hex characters. Add it in Vercel → Settings → Environment Variables.`)
  }
  return Buffer.from(hex, 'hex')
}

/** True when both keys are set, so the CRM can store personal details. */
export function piiReady(): boolean {
  try { key('PII_ENCRYPTION_KEY'); key('PII_HASH_KEY'); return true } catch { return false }
}

export function encryptPII(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key('PII_ENCRYPTION_KEY'), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${PREFIX}${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${data.toString('base64')}`
}

export function decryptPII(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith(PREFIX)) throw new Error('Unrecognised encrypted value')
  const [iv, tag, data] = value.slice(PREFIX.length).split('.')
  const decipher = createDecipheriv(ALGORITHM, key('PII_ENCRYPTION_KEY'), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase()

/** UK-friendly: "07700 900123", "+44 7700 900123" and "447700900123" all become "447700900123". */
export function normalisePhone(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `44${digits.slice(1)}`
  return digits.replace(/\D/g, '')
}

/** A keyed hash for finding the same person again without decrypting anyone. */
export function lookupHash(kind: 'email' | 'phone', value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null
  const normal = kind === 'email' ? normaliseEmail(value) : normalisePhone(value)
  if (!normal) return null
  return createHmac('sha256', key('PII_HASH_KEY')).update(`${kind}:${normal}`).digest('hex')
}
