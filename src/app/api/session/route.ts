import { deleteTranscript, verifyCounters, SESSION_COOKIE } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'No session cookie' }, { status: 401 })
  }

  const counters = verifyCounters(token)
  if (!counters) {
    const res = NextResponse.json(
      { error: 'Session expired or not found' },
      { status: 410 },
    )
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  return NextResponse.json({
    id: counters.id,
    created_at: counters.created_at,
    last_active: counters.last_active,
    message_count: counters.message_count,
    crisis_flag: counters.crisis_flag,
    extended: counters.extended,
  })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const counters = verifyCounters(req.cookies.get(SESSION_COOKIE)?.value)
  if (counters) {
    await deleteTranscript(counters.id)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE)

  return response
}
