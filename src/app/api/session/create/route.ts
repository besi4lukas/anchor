import {
  counterCookie,
  createCounters,
  writeTranscript,
  SESSION_TTL,
} from '@/lib/session'
import { checkSessionCreateLimit } from '@/lib/rate-limit'
import { hashClientIp } from '@/lib/client-ip'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // The only ceiling on what an anonymous caller can spend. There is no account
  // to attach cost to, and every session this mints is worth a conversation's
  // worth of Claude, so an unguarded route here is an open tab.
  //
  // A null hash means the address could not be read at all, which is the
  // ordinary case in local development. That allows: refusing everyone their
  // session because a header was missing is a worse failure than the one being
  // prevented.
  const ipHash = hashClientIp(req)
  if (ipHash) {
    const limit = await checkSessionCreateLimit(ipHash)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many sessions started. Please wait a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfter ?? 60) },
        },
      )
    }
  }

  const counters = createCounters()

  // Best effort: the session is fully usable without this landing.
  await writeTranscript(counters.id, [])

  const expiresAt = new Date(counters.created_at + SESSION_TTL * 1000)

  const response = NextResponse.json({
    sessionId: counters.id,
    expiresAt: expiresAt.toISOString(),
  })

  response.cookies.set(counterCookie(counters))

  return response
}
