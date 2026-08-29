import { deleteTranscript, verifyCounters, SESSION_COOKIE } from '@/lib/session'
import { requireSession } from '@/lib/api/session-guard'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = requireSession(req)
  if (!guard.ok) return guard.response
  const { counters } = guard

  // Spelled out rather than spread: the counters are only half the story the
  // cookie tells, and returning the object wholesale is how a signature ends
  // up in a response body.
  return NextResponse.json({
    id: counters.id,
    created_at: counters.created_at,
    last_active: counters.last_active,
    message_count: counters.message_count,
    crisis_flag: counters.crisis_flag,
    extended: counters.extended,
  })
}

/**
 * Deliberately does not use requireSession. Clearing a session is idempotent:
 * it reports ok and drops the cookie whatever the caller presented, because
 * "your session was already gone" is not a failure of the thing being asked
 * for. Routing it through the guard would answer 401 to someone whose only
 * request is to leave.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const counters = verifyCounters(req.cookies.get(SESSION_COOKIE)?.value)
  const deleted = counters ? await deleteTranscript(counters.id) : true

  // The cookie is cleared either way: whatever happened to the stored
  // transcript, holding a live session somebody has asked to end is worse. But
  // a failed delete is reported as one rather than dressed up as `ok: true` —
  // this endpoint backs a promise that the conversation is gone.
  const response = deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json(
        { error: 'Could not clear the conversation.' },
        { status: 503 },
      )
  response.cookies.delete(SESSION_COOKIE)

  return response
}
