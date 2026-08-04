import {
  counterCookie,
  createCounters,
  writeTranscript,
  SESSION_TTL,
} from '@/lib/session'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
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
