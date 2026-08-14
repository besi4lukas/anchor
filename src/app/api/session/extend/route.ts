import { NextRequest, NextResponse } from 'next/server'
import {
  counterCookie,
  markExtendedFlag,
  readExtendedFlag,
  touchTranscript,
  verifyCounters,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SESSION_TTL,
  type SessionCounters,
} from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
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

  // Cookie OR server record. The cookie answers when Redis is down; the record
  // answers when the client replays a cookie saved before it extended.
  const alreadyExtended =
    counters.extended || (await readExtendedFlag(counters.id))

  if (alreadyExtended) {
    return NextResponse.json(
      { error: 'This session has already been extended once.' },
      { status: 409 },
    )
  }

  await markExtendedFlag(counters.id)
  await touchTranscript(counters.id)

  const now = Date.now()

  // SESSION_MAX_AGE is an absolute ceiling that extension does not lift, so a
  // session extended near the end of its life gets whatever is left rather than
  // a full hour. Reporting the honest figure keeps the on-screen timer from
  // counting down to a moment that has already passed.
  const expiryMs = Math.min(
    now + SESSION_TTL * 1000,
    counters.created_at + SESSION_MAX_AGE * 1000,
  )

  const extended: SessionCounters = {
    ...counters,
    extended: true,
    last_active: now,
  }

  const response = NextResponse.json({
    newExpiry: new Date(expiryMs).toISOString(),
  })
  response.cookies.set(counterCookie(extended))

  return response
}
