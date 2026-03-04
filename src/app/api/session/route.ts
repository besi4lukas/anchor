import { getSession, deleteSession, SESSION_COOKIE } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'No session cookie' }, { status: 401 })
  }

  const session = await getSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: 'Session expired or not found' },
      { status: 410 },
    )
  }

  return NextResponse.json({
    id: session.id,
    created_at: session.created_at,
    last_active: session.last_active,
    message_count: session.message_count,
    crisis_flag: session.crisis_flag,
    extended: session.extended,
  })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await deleteSession(sessionId)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE)

  return response
}
