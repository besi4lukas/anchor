import { NextRequest, NextResponse } from 'next/server'
import {
  verifyCounters,
  SESSION_COOKIE,
  type SessionCounters,
} from '@/lib/session'

/**
 * Either the caller may proceed with verified counters, or it must return the
 * response we built for it.
 *
 * A tagged union rather than `SessionCounters | NextResponse`. The bare union
 * would narrow today — the two share no property — but only by accident, and
 * the cheap check it invites (`'id' in result`) rests on NextResponse happening
 * not to have an `id`. `instanceof` is no safer: NextResponse resolves to
 * different classes in the node bundle, the edge bundle and under ts-jest, and
 * an instanceof that silently returns false here means a response object gets
 * read as counters and an expired session answers 200.
 */
export type SessionGuard =
  | { ok: true; counters: SessionCounters }
  | { ok: false; response: NextResponse }

/**
 * The cookie-read → verify → 401/410 preamble, which was copied verbatim into
 * three routes and had already drifted in one of them.
 *
 * Synchronous: verifyCounters is HMAC work, not I/O, and making this async
 * would have three call sites awaiting something that never yields.
 *
 * Deliberately does not catch. verifyCounters throws when SESSION_SECRET is
 * missing, which surfaces as a 500; swallowing it would turn a misconfigured
 * deploy into a silent 401 for every visitor.
 */
export function requireSession(req: NextRequest): SessionGuard {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No session' }, { status: 401 }),
    }
  }

  const counters = verifyCounters(token)
  if (!counters) {
    // The stale cookie is cleared on the way out. Leaving it would have the
    // client replay the same dead token on every subsequent request.
    const response = NextResponse.json(
      { error: 'Session expired or not found' },
      { status: 410 },
    )
    response.cookies.delete(SESSION_COOKIE)
    return { ok: false, response }
  }

  return { ok: true, counters }
}
