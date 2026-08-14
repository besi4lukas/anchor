import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { parseBody, MoodInputSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Anonymous mood counters.
 *
 * The session cookie is deliberately never read here. All that is stored is an
 * increment on one of five shared keys, so there is nothing linking a rating to
 * a session, a transcript, or a person — which is what lets the privacy page
 * say so without qualification.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw: unknown = await req.json().catch(() => null)

  const parsed = parseBody(MoodInputSchema, raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { value } = parsed.data

  try {
    await getRedis().incr(`mood:${value}`)
  } catch (error) {
    // Reported rather than swallowed: claiming ok on a write that did not land
    // would quietly corrupt the only number this endpoint exists to produce.
    console.error('[Mood] Redis unavailable, rating dropped:', error)
    return NextResponse.json(
      { error: 'Could not record that right now.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ ok: true })
}
