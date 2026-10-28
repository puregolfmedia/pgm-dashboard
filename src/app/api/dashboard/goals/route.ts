import { NextResponse } from 'next/server'
import { resolveClientAccess } from '@/lib/access'
import { getGoalProgress } from '@/lib/goals'

export async function GET(request: Request) {
  const access = await resolveClientAccess(request)
  if (access instanceof NextResponse) return access
  const goals = await getGoalProgress(access.clientId)
  return NextResponse.json({ data: goals, lastUpdated: new Date().toISOString(), error: null })
}
