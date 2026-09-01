import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { encrypt } from '@/lib/crypto'
import { cacheInvalidate } from '@/lib/cache'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as any
  if (!session?.user || user.role !== 'ADMIN') return null
  return session
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { dataConfig: true, users: { where: { role: 'CLIENT' } } },
  })
  if (!client) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  // Never return encrypted token values to the client
  const safe = {
    ...client,
    dataConfig: client.dataConfig ? {
      ...client.dataConfig,
      ga4ServiceAccountJson: client.dataConfig.ga4ServiceAccountJson ? '[configured]' : null,
      metaAccessToken: client.dataConfig.metaAccessToken ? '[configured]' : null,
      emailOctopusApiKey: client.dataConfig.emailOctopusApiKey ? '[configured]' : null,
      mailchimpApiKey: client.dataConfig.mailchimpApiKey ? '[configured]' : null,
    } : null,
  }

  return NextResponse.json({ data: safe, error: null })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { ga4PropertyId, ga4ServiceAccountJson, ga4BookingEventName, ga4MembershipEventName,
          metaAdAccountId, metaAccessToken, emailOctopusApiKey,
          mailchimpApiKey, mailchimpListId, newPassword } = body

  // Handle password reset
  if (newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.updateMany({
      where: { clientId: params.id, role: 'CLIENT' },
      data: { passwordHash, passwordResetRequired: true },
    })
  }

  // Build data config update — only encrypt non-empty values
  const configData: Record<string, any> = {}
  if (ga4PropertyId !== undefined) configData.ga4PropertyId = ga4PropertyId || null
  if (ga4BookingEventName !== undefined) configData.ga4BookingEventName = ga4BookingEventName || 'generate_lead'
  if (ga4MembershipEventName !== undefined) configData.ga4MembershipEventName = ga4MembershipEventName || 'membership_enquiry'
  if (ga4ServiceAccountJson) configData.ga4ServiceAccountJson = encrypt(ga4ServiceAccountJson)
  if (metaAdAccountId !== undefined) configData.metaAdAccountId = metaAdAccountId || null
  if (metaAccessToken) configData.metaAccessToken = encrypt(metaAccessToken)
  if (emailOctopusApiKey) configData.emailOctopusApiKey = encrypt(emailOctopusApiKey)
  if (mailchimpListId !== undefined) configData.mailchimpListId = mailchimpListId || null
  if (mailchimpApiKey) configData.mailchimpApiKey = encrypt(mailchimpApiKey)

  if (Object.keys(configData).length > 0) {
    await prisma.dataSourceConfig.upsert({
      where: { clientId: params.id },
      create: { clientId: params.id, ...configData },
      update: configData,
    })
  }

  // Invalidate cache for this client
  cacheInvalidate(params.id)

  return NextResponse.json({ data: { ok: true }, error: null })
}
