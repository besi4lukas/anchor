import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'

/**
 * `raw` rides alongside `data` on the success branch, because a schema is not
 * always the whole story. The chat route validates `message` but bounds the
 * accompanying transcript with sanitizeTranscript instead — dropping bad turns
 * rather than rejecting the request over one — and so needs the unvalidated
 * body back. Returning it here keeps that to a single `req.json()`; the body
 * stream can only be consumed once.
 */
export type JsonBody<T> =
  | { ok: true; data: T; raw: unknown }
  | { ok: false; response: NextResponse }

/** Reads and validates a JSON body, or builds the 400 the caller returns. */
export async function readJsonBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
): Promise<JsonBody<T>> {
  const raw: unknown = await req.json().catch(() => null)

  const parsed = parseBody(schema, raw)
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: parsed.error }, { status: 400 }),
    }
  }

  return { ok: true, data: parsed.data, raw }
}
