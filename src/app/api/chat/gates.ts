import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api/session-guard'
import { readJsonBody } from '@/lib/api/json-body'
import { ChatInputSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { MAX_MESSAGES, type SessionCounters } from '@/lib/session'

/**
 * Everything the rest of the turn needs, and deliberately not the request.
 * The body stream can only be read once; keeping NextRequest out of this type
 * makes a second `req.json()` downstream unrepresentable rather than merely
 * discouraged.
 */
export interface ChatRequest {
  counters: SessionCounters
  message: string
}

export type ChatGateResult =
  | { ok: true; request: ChatRequest }
  | { ok: false; response: NextResponse }

/**
 * The four ways a turn can be refused, cheapest first.
 *
 * This function is the whole of the route's error surface: past it, every exit
 * is a 200 SSE body, including the failures. That used to be a comment; as a
 * return type it is something a future contributor has to argue with the
 * compiler about.
 *
 * The order is load-bearing in both directions. A capped session must not reach
 * Redis, and an unparseable body must not reach a paid API.
 */
export async function runGates(req: NextRequest): Promise<ChatGateResult> {
  const guard = requireSession(req)
  if (!guard.ok) return { ok: false, response: guard.response }
  const { counters } = guard

  // Both the success and fallback paths add exactly two turns, so the cap is
  // tested against what this turn is about to cost, not what it has spent.
  if (counters.message_count + 2 > MAX_MESSAGES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Message limit reached' },
        { status: 429 },
      ),
    }
  }

  const body = await readJsonBody(req, ChatInputSchema)
  if (!body.ok) return { ok: false, response: body.response }

  const rateLimit = await checkRateLimit(counters.id)
  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many messages. Take a breath and try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) },
        },
      ),
    }
  }

  return {
    ok: true,
    request: { counters, message: body.data.message },
  }
}
