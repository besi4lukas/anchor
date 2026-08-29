import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBody } from '@/lib/validation'

/**
 * The schema is the whole story: a caller gets the validated data or the 400,
 * never the unvalidated body. `raw` used to ride along on the success branch so
 * the chat route could take a transcript the schema did not describe — which is
 * exactly how forged `assistant` turns reached the model, so it is gone.
 */
export type JsonBody<T> =
  | { ok: true; data: T }
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

  return { ok: true, data: parsed.data }
}
