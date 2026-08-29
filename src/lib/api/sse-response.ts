import { NextResponse } from 'next/server'
import { counterCookie, type SessionCounters } from '@/lib/session'

/**
 * An SSE response carrying the session's updated counters.
 *
 * Set-Cookie is a header, so the counters have to be committed before the body
 * starts streaming. Every reply path adds exactly two turns, so charging for
 * them up front matches what actually gets stored.
 *
 * Server-only, which is why it lives here rather than in lib/chat-stream.ts
 * beside the encoder: that file is imported by the browser, and pulling
 * next/server and lib/session into it would drag node:crypto and the Upstash
 * SDK into the client bundle.
 */
export function sseResponse(
  body: BodyInit,
  counters: SessionCounters,
): NextResponse {
  const response = new NextResponse(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
  response.cookies.set(counterCookie(counters))
  return response
}
